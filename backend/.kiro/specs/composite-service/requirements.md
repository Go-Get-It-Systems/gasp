# Requirements Document

## Introduction

The **Composite Service** feature adds server-side video composition to the GASP backend. When a recipient sends a reaction, the client calls `POST /api/v1/reactions/composite` with the CDN URLs of the reaction video and the original gasp. The backend downloads both assets, uses FFmpeg to compose them into a single 9:16 video (reaction on the left 1/3, gasp on the right 2/3), overlays the GASP watermark, uploads the result to Firebase Storage, and returns the `compositeUrl`. This composited video is what the sender receives — giving their reaction full context.

---

## Glossary

- **Composite_Job**: A single call to `POST /api/v1/reactions/composite`. Synchronous — the HTTP response is not returned until FFmpeg finishes.
- **compositeUrl**: The Firebase Storage CDN URL of the merged output video returned to the client.
- **reactionVideoUrl**: The CDN URL of the recipient's raw front-camera reaction video (already uploaded by the client before this call).
- **gaspUrl**: The CDN URL of the original gasp media asset (image or video) on Firebase Storage.
- **Layout_Split_1/3_2/3**: The fixed side-by-side layout — reaction on the left 1/3 (360×1920 px), gasp on the right 2/3 (720×1920 px) of a 1080×1920 frame.
- **GASP_WATERMARK**: The watermark PNG asset at `assets/watermark.png` embedded at bottom-right with `opacity=0.7`.
- **FFmpeg_Chain**: The FFmpeg filtergraph that scales both inputs, stacks them horizontally, overlays the watermark, and encodes as H.264/MP4.
- **Composite_Service**: The module at `src/modules/composite/` that implements the endpoint, download, FFmpeg processing, and upload.
- **tmp_dir**: A per-request temporary directory created under `/tmp/composite/<requestId>/` and deleted in the `finally` block regardless of success or failure.

---

## Requirements

### Requirement 1: Endpoint contract

**User Story:** As the GASP mobile client, I want a `POST /api/v1/reactions/composite` endpoint that accepts my reaction and gasp URLs and returns a composited video URL, so that the sender receives a rich side-by-side reaction.

#### Acceptance Criteria

1. THE endpoint SHALL be registered at `POST /api/v1/reactions/composite` under the existing `/api/v1` prefix in `src/index.ts`.
2. THE endpoint SHALL require JWT authentication via `authMiddleware`.
3. THE endpoint SHALL accept a JSON body `{ reactionVideoUrl: string, gaspUrl: string, layout: "1/3-2/3" }` and validate it with a Zod schema.
4. IF the `layout` field is absent from the request body, THE endpoint SHALL return HTTP 400 with `{ error: "missing_layout", message: "layout is required" }`.
5. IF the `layout` value is not `"1/3-2/3"`, THE endpoint SHALL return HTTP 400 with `{ error: "unsupported_layout", message: "Only layout '1/3-2/3' is supported" }`.
6. IF either `reactionVideoUrl` or `gaspUrl` fails the `isAllowedMediaUrl` check, THE endpoint SHALL return HTTP 400 with `{ error: "VALIDATION_ERROR" }` (standard Zod validation response).
7. ON success, THE endpoint SHALL return HTTP 200 with `{ compositeUrl: string }`.
8. THE endpoint SHALL apply the existing `messageRateLimit` (30 req/min) from `src/shared/rate-limit.ts`.

---

### Requirement 2: Input validation and media download

**User Story:** As the backend, I want to validate and download the input media before starting FFmpeg, so that I return fast structured errors instead of crashing mid-process.

#### Acceptance Criteria

1. BEFORE starting FFmpeg, THE Composite_Service SHALL attempt to download both `reactionVideoUrl` and `gaspUrl` to `tmp_dir` using `fetch` with a 10 000 ms timeout.
2. IF either URL is unreachable or returns a non-2xx HTTP status, THE endpoint SHALL return HTTP 422 with `{ error: "unreachable_input", message: "One or more input URLs could not be fetched" }` within 3 000 ms of the download attempt failing.
3. WHEN downloading, THE Composite_Service SHALL validate the `Content-Type` response header. IF the MIME type is not in `{ video/mp4, video/quicktime, video/webm, image/jpeg, image/png, image/webp }`, THE endpoint SHALL return HTTP 422 with `{ error: "invalid_media_type", message: "Unsupported media type: <mime>" }`.
4. THE downloaded files SHALL be saved as `reaction.<ext>` and `gasp.<ext>` in `tmp_dir`, where `<ext>` is derived from the `Content-Type` header.

---

### Requirement 3: FFmpeg composition

**User Story:** As the backend, I want FFmpeg to produce a pixel-perfect 1080×1920 side-by-side composite video, so that the output matches the optimistic preview the recipient sees on their device.

#### Acceptance Criteria

1. THE FFmpeg_Chain SHALL scale the reaction video to exactly `360×1920` px using `scale=360:1920:force_original_aspect_ratio=decrease,pad=360:1920:(ow-iw)/2:(oh-ih)/2`.
2. THE FFmpeg_Chain SHALL scale the gasp asset to exactly `720×1920` px using `scale=720:1920:force_original_aspect_ratio=decrease,pad=720:1920:(ow-iw)/2:(oh-ih)/2`.
3. IF the gasp asset is an image (`image/jpeg`, `image/png`, `image/webp`), THE FFmpeg_Chain SHALL loop it for the full duration of the reaction video using the `-loop 1 -t <reaction_duration>` input flags.
4. THE FFmpeg_Chain SHALL stack the two scaled streams horizontally with `hstack=inputs=2` to produce a `1080×1920` frame.
5. THE FFmpeg_Chain SHALL overlay the watermark PNG at pixel position `(1080 - watermark_width - 16, 1920 - watermark_height - 16)` with `format=rgba,colorchannelmixer=aa=0.7` for opacity.
6. THE output SHALL be encoded as `H.264` with `-c:v libx264 -preset fast -crf 23` in an `MP4` container.
7. THE output SHALL be exactly `30 fps` (`-r 30`).
8. THE output audio track SHALL be the reaction video audio, re-encoded as AAC at 128k (`-c:a aac -b:a 128k`). IF the reaction video has no audio track, THE output SHALL have no audio track.
9. THE output SHALL be written to `tmp_dir/output.mp4`.
10. IF FFmpeg exits with a non-zero code, THE endpoint SHALL return HTTP 500 with `{ error: "COMPOSITE_FAILED", message: "FFmpeg processing failed" }` and log the FFmpeg stderr to the Fastify logger.

---

### Requirement 4: Upload and response

**User Story:** As the backend, I want to upload the composited video to Firebase Storage and return the CDN URL, so that the client can deliver it to the sender via `sendMessage`.

#### Acceptance Criteria

1. AFTER FFmpeg succeeds, THE Composite_Service SHALL upload `output.mp4` from `tmp_dir` to Firebase Storage under the path `composites/<reactorId>/<timestamp>_<randomId>.mp4` using the existing `uploadStreamToStorage` function from `src/modules/uploads/uploads.service.ts`.
2. THE upload SHALL use `contentType: 'video/mp4'` and `type: 'composites'` (a new allowed media type to be added alongside `'gasps' | 'reactions' | 'avatars'`).
3. ON successful upload, THE endpoint SHALL return HTTP 200 with `{ compositeUrl: downloadUrl }`.
4. THE `tmp_dir` SHALL be deleted with `fs.rm(tmpDir, { recursive: true, force: true })` in a `finally` block that runs regardless of success, FFmpeg failure, or upload failure.

---

### Requirement 5: Performance — latency budget

**User Story:** As a product stakeholder, I want composite jobs to complete within the client's 8-second timeout budget, so that recipients are not left with a failed reaction.

#### Acceptance Criteria

1. THE Composite_Service SHALL complete a Composite_Job and return `compositeUrl` within 5 000 ms (p50) for reaction videos up to 30 s in duration.
2. THE Composite_Service SHALL complete within 8 000 ms (p95) for reaction videos up to 30 s in duration.
3. THE FFmpeg command SHALL use `-preset fast` (not `slow` or `medium`) to prioritise encoding speed over file size for this latency budget.
4. THE download step (Requirement 2.1) SHALL use a streaming `pipeline` to disk rather than buffering the full video in memory, to keep peak memory usage bounded.

---

### Requirement 6: Error codes and Sentry

**User Story:** As a developer on-call, I want all Composite_Job failures to be captured in Sentry with enough context to diagnose the issue without re-running the job.

#### Acceptance Criteria

1. IF the download step fails (unreachable or bad MIME), THE Composite_Service SHALL call `Sentry.captureException` with the error and `{ reactionVideoUrl, gaspUrl, step: 'download' }` as extra context.
2. IF FFmpeg exits with a non-zero code, THE Composite_Service SHALL call `Sentry.captureException` with the FFmpeg stderr (truncated to 2000 chars) and `{ reactionVideoUrl, gaspUrl, step: 'ffmpeg' }` as extra context.
3. IF the Firebase Storage upload fails, THE Composite_Service SHALL call `Sentry.captureException` with `{ step: 'upload' }` as extra context.
4. ALL Sentry calls SHALL include `tags: { feature: 'composite-service' }`.

---

### Requirement 7: Infrastructure — FFmpeg in Docker

**User Story:** As a developer deploying to Railway, I want FFmpeg to be available in the production container, so that composite jobs do not fail with "command not found".

#### Acceptance Criteria

1. THE `Dockerfile` SHALL install FFmpeg in the **runtime stage** (not just the builder stage) using `RUN apk add --no-cache ffmpeg`.
2. THE installed FFmpeg SHALL support `libx264` (H.264 encoding) and AAC audio encoding.
3. THE `Dockerfile` change SHALL NOT increase the final image size by more than 80 MB.

---

### Requirement 8: Correctness properties for testing

**User Story:** As a developer, I want formally testable properties for the composite pipeline, so that edge cases in video dimensions, durations, and layouts are caught automatically.

#### Acceptance Criteria

1. FOR any valid `reactionVideoUrl` and `gaspUrl` with supported MIME types and `layout="1/3-2/3"`, THE endpoint SHALL return HTTP 200 with a `compositeUrl` string within 10 000 ms.
2. THE output video at `compositeUrl` SHALL have `width=1080` and `height=1920`, regardless of input video dimensions.
3. FOR a reaction video with `duration <= 30s`, `|output.duration - reaction.duration| <= 0.5s`.
4. THE output video SHALL contain exactly one audio track derived from the reaction video audio.
5. FOR the same `(reactionVideoUrl, gaspUrl)` inputs submitted twice, both responses SHALL have output videos with identical `width`, `height`, and `|duration_a - duration_b| <= 0.5s`.
6. FOR any `layout` value not in `{ "1/3-2/3" }`, THE endpoint SHALL return HTTP 400 with `error: "unsupported_layout"`.
7. FOR any input URL resolving to a MIME type not in the allowed set, THE endpoint SHALL return HTTP 422 with `error: "invalid_media_type"`.
