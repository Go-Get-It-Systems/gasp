# Requirements Document

## Introduction

The **Super Imposed Reaction** feature transforms how the recipient's reaction is delivered to the sender. Today the sender receives only a raw front-camera clip. After this feature ships, the sender will receive a single composited video in which the original gasp occupies the right 2/3 of a 9:16 frame and the recipient's reaction occupies the left 1/3, with the GASP watermark in the bottom-right corner. Composition is performed server-side via FFmpeg; the client records the reaction video exactly as it does today, then asks the Composite_Service to merge the two assets and returns the result through the existing upload pipeline.

---

## Glossary

- **Gasp_Viewer**: The `view-gasp.tsx` screen and the `useViewGasp` hook that orchestrate countdown, recording, and upload for the recipient.
- **ReactionCapture**: The draggable PiP component (`ReactionCapture.tsx`) that renders the live front camera during recording.
- **ReactionPreview**: The review screen (`ReactionPreview.tsx`) shown after recording, before the user decides to send or discard.
- **ReactionComposite**: The visual-only React Native `View` component (`ReactionComposite.tsx`) used as the optimistic preview during upload; it does NOT produce a real video file.
- **Composite_Service**: The backend endpoint that accepts `reactionVideoUrl`, `gaspUrl`, and `layout` and returns a `compositeUrl` (an FFmpeg server-side merge job).
- **Composite_Job**: A single processing request issued to the Composite_Service for one reaction+gasp pair.
- **Upload_Queue**: The existing persistent queue (`uploadQueue.ts`) that wraps `uploadWithRetry` and `enqueueUpload`.
- **AVCAPTURE_SETTLE_MS**: The existing 2 000 ms delay between stopping the gasp video player and starting `recordAsync`; this value MUST NOT change.
- **compositeUrl**: The CDN URL of the merged video returned by the Composite_Service.
- **Layout_Split_1/3_2/3**: The fixed output layout — reaction on the left 1/3, gasp on the right 2/3 of a 9:16 frame.
- **Optimistic_Preview**: The `ReactionComposite` visual shown immediately after recording ends, before the Composite_Job completes.
- **gaspUrl**: The remote CDN URL of the original gasp media asset (image or video), as stored on the backend — not the local cached URI.

---

## Requirements

### Requirement 1: Recording phase — no change to capture behaviour

**User Story:** As a recipient, I want the recording phase to feel identical to what it does today, so that my genuine reaction is captured without distraction.

#### Acceptance Criteria

1. THE Gasp_Viewer SHALL call `reactionCameraRef.current.recordAsync({ maxDuration: reactionDurationS })` to record only the front-camera stream, with no additional parameters added or existing parameters modified.
2. WHILE `isRecording` is `true`, THE ReactionCapture SHALL render the draggable PiP overlay at exactly `PIP_WIDTH = 120` px by `PIP_HEIGHT = 160` px, at the corner position persisted in AsyncStorage under key `@gasp/reaction-pip-corner`.
3. WHILE `isRecording` is `true`, THE ReactionCapture ring progress indicator SHALL reach approximately 50% visual completion at `maxDurationS * 500` ms elapsed and full completion at `maxDurationS * 1 000` ms elapsed, transitioning the ring stroke colour from `rgba(255,255,255,0.4)` to `#EF4444` at 70% elapsed time.
4. WHEN the gasp media type is `'video'`, THE Gasp_Viewer SHALL call `onStopGaspVideo()` before starting `recordAsync`, and SHALL wait exactly `AVCAPTURE_SETTLE_MS` (2 000 ms) after the call before invoking `recordAsync`.
5. WHEN the gasp media type is `'image'`, THE Gasp_Viewer SHALL invoke `recordAsync` after `AVCAPTURE_SETTLE_MS` (2 000 ms) from `handleCountdownComplete`, without calling `onStopGaspVideo()`.
6. THE Gasp_Viewer SHALL pass `reactionDurationS = Math.min(holdDurationS, MAX_REACTION_DURATION_S)` as `maxDuration` to `recordAsync`, where `MAX_REACTION_DURATION_S = 30`.

---

### Requirement 2: Post-recording upload — reaction video uploaded before composite is requested

**User Story:** As a recipient, I want my reaction to be reliably uploaded before I tap Send, so that the composite job never fails due to a missing asset.

#### Acceptance Criteria

1. WHEN `handleRelease` resolves with a valid local `videoUri`, THE Gasp_Viewer SHALL call `enqueueUpload(videoUri, 'reactions', userId)` and store the returned queue ID in `bgUploadQueueIdRef.current`.
2. WHEN the user taps "Send Reaction", THE Gasp_Viewer SHALL call `uploadWithRetry(localUri, 'reactions', userId)` to obtain a `reactionVideoUrl` (remote CDN URL) before calling `router.back()` or issuing a Composite_Job request. Only after a successful upload SHALL the Gasp_Viewer call `removeFromQueue(bgUploadQueueIdRef.current)` and proceed.
3. WHILE the foreground upload triggered by "Send Reaction" is in progress, THE ReactionPreview SHALL display the Send button in a disabled, loading state; it SHALL re-enable the button only if the upload fails.
4. IF the foreground upload of the reaction video fails after all retry attempts, THEN THE Gasp_Viewer SHALL display an error toast and keep the ReactionPreview screen visible with the Send button re-enabled so the user can retry or discard. THE Gasp_Viewer SHALL NOT call `router.back()` on upload failure.
5. WHEN issuing a Composite_Job, THE Gasp_Viewer SHALL send the payload `{ reactionVideoUrl, gaspUrl, layout: "1/3-2/3" }` where `gaspUrl` is the remote CDN URL of the original gasp media as received from the backend.

---

### Requirement 3: Optimistic preview during composite processing

**User Story:** As a recipient reviewing my reaction, I want to see a composite preview immediately after recording, so that I understand what the sender will receive before I tap Send.

#### Acceptance Criteria

1. WHEN `previewUri` (the local reaction video URI) is set and the ReactionPreview screen is displayed, THE ReactionPreview SHALL render `ReactionComposite` with `reactionVideoUri = previewUri` and `originalUri = gaspUrl`.
2. WHILE ReactionPreview is displayed, THE ReactionComposite SHALL render the gasp asset occupying 2/3 of the component's rendered width on the right side, and the reaction video occupying 1/3 of the component's rendered width on the left side.
3. WHILE ReactionPreview is displayed, THE ReactionComposite SHALL overlay the GASP watermark image at the bottom-right corner of the component, with `width = 0.12 * componentWidth` and `opacity = 0.7`.
4. WHILE a Composite_Job is in progress after the user taps Send, THE ReactionPreview SHALL display a visible activity indicator; THE activity indicator SHALL be hidden once the Composite_Job resolves or fails.
5. WHEN the foreground upload of the reaction video succeeds and `reactionVideoUrl` is obtained, THE Gasp_Viewer SHALL call `router.back()` before dispatching the Composite_Job request, so the user is not blocked waiting for server-side processing.

---

### Requirement 4: Composite result delivery to sender

**User Story:** As a sender, I want to receive the composited video — showing both my original gasp and the recipient's reaction side-by-side — so that the reaction has full context.

#### Acceptance Criteria

1. WHEN the Composite_Service returns a `compositeUrl`, THE Gasp_Viewer SHALL call `sendMessage(conversationId, '[Reaction]', 'reaction', compositeUrl, messageId)` to deliver the composited video to the sender.
2. IF `sendMessage` fails after a `compositeUrl` has been received, THEN THE Gasp_Viewer SHALL retry `sendMessage` up to 3 times, preserving the same `compositeUrl` across all retry attempts, with delays of 0 ms, 500 ms, and 1 500 ms before each respective attempt.
3. THE compositeUrl video SHALL have reaction occupying exactly 1/3 of the frame width on the left and the gasp occupying exactly 2/3 of the frame width on the right.
4. THE compositeUrl video SHALL be in 9:16 portrait aspect ratio (1 080 x 1 920 px).
5. THE compositeUrl video SHALL contain the GASP watermark logo at the bottom-right corner.
6. IF `gaspUrl` refers to an image asset, THEN THE Composite_Service SHALL render the image as a static frame held for the full duration of the reaction video in the output.
7. WHEN a Composite_Job request is received, THE Composite_Service SHALL return a `compositeUrl` within 5 000 ms (p50) for reaction videos up to 30 s in duration.
8. IF the Composite_Service does not return a `compositeUrl` within 5 000 ms, THEN the system SHALL follow the fallback path defined in Requirement 5.

---

### Requirement 5: Error handling — composite job failure

**User Story:** As a recipient, I want a clear fallback if the composite fails, so that the sender still receives my reaction and I am not left confused.

#### Acceptance Criteria

1. IF the Composite_Service returns an HTTP error or does not respond within 8 000 ms, THEN THE Gasp_Viewer SHALL call `sendMessage(conversationId, '[Reaction]', 'reaction', reactionVideoUrl, messageId)` using the raw reaction video URL as the fallback.
2. WHEN the fallback path is triggered, THE Gasp_Viewer SHALL display a non-blocking toast notification that auto-dismisses after 3 000 ms, informing the user the enhanced composite could not be generated.
3. IF the Composite_Service returns an HTTP error, THEN THE Gasp_Viewer SHALL call `Sentry.captureException` with the error and the Composite_Job payload `{ reactionVideoUrl, gaspUrl, layout }` attached as `extra` context.
4. IF the Composite_Service request times out at 8 000 ms, THEN THE Gasp_Viewer SHALL call `Sentry.captureMessage` with the timeout duration and Composite_Job payload attached as `extra` context.
5. THE Gasp_Viewer SHALL NOT keep the user waiting on the ReactionPreview screen for composite job completion; navigation back SHALL have already occurred before the Composite_Job was dispatched (per Requirement 3.5).

---

### Requirement 6: Discard cancels all in-flight work

**User Story:** As a recipient, I want tapping Discard to cleanly cancel everything in progress, so that no orphaned uploads or composite jobs consume server resources.

#### Acceptance Criteria

1. WHEN the user taps "Discard" on ReactionPreview and `bgUploadQueueIdRef.current` is non-null, THE Gasp_Viewer SHALL call `removeFromQueue(bgUploadQueueIdRef.current)` to remove the reaction video from the Upload_Queue, whether the item is in `pending` or `uploading` status.
2. WHEN the user taps "Discard" on ReactionPreview and a Composite_Job HTTP request is in-flight, THE Gasp_Viewer SHALL abort the request using an `AbortController` signal so no further composite processing occurs for this reaction.
3. WHEN the user taps "Discard" and the gasp was opened in inbox mode (a `gaspId` is present in `gaspIdRef.current`), THE Gasp_Viewer SHALL call `closeViewMutation.mutate(gaspId)` to mark the gasp as closed on the backend.
4. WHEN the user taps "Discard", THE Gasp_Viewer SHALL call `router.back()` before initiating any cleanup network calls, ensuring navigation is not blocked by in-flight requests.

---

### Requirement 7: Layout specification for Composite_Service

**User Story:** As a developer integrating with the Composite_Service, I want the layout contract to be precisely defined, so that the server-side FFmpeg filter can be implemented without ambiguity.

#### Acceptance Criteria

1. THE Composite_Service SHALL accept a `layout` field with value `"1/3-2/3"` to select the fixed side-by-side layout.
2. IF the `layout` field is absent from the request body, THEN THE Composite_Service SHALL return HTTP 400 with error code `missing_layout`.
3. WHEN `layout` is `"1/3-2/3"`, THE Composite_Service SHALL produce a 1 080 x 1 920 px video at exactly 30 fps with the reaction stream scaled to 360 x 1 920 px on the left and the gasp stream scaled to 720 x 1 920 px on the right.
4. THE Composite_Service SHALL encode the output as H.264 in an MP4 container.
5. THE Composite_Service SHALL embed the GASP watermark PNG at pixel position `(1 080 - watermark_width - 16, 1 920 - watermark_height - 16)` with `opacity = 0.7`.
6. THE Composite_Service SHALL preserve the reaction video audio track in the output; the output audio content SHALL match the reaction video audio. The gasp audio track SHALL be excluded from the composite output.
7. IF a required input URL (`reactionVideoUrl` or `gaspUrl`) is unreachable, THEN THE Composite_Service SHALL return HTTP 422 with error code `unreachable_input` within 3 000 ms.

---

### Requirement 8: Performance — composite latency budget

**User Story:** As a product stakeholder, I want the composite to be generated within an acceptable time window, so that recipients are not frustrated waiting to send their reaction.

#### Acceptance Criteria

1. THE Composite_Service SHALL complete a Composite_Job and return `compositeUrl` within 5 000 ms (p50) and within 8 000 ms (p95) for reaction videos up to 30 s in duration, measured from request receipt to response.
2. WHEN the Composite_Job is submitted by the client, THE ReactionPreview SHALL render the Optimistic_Preview within 200 ms of the request dispatch, without waiting for the Composite_Job to complete.
3. THE Gasp_Viewer SHALL configure the Composite_Job HTTP request with an `AbortController` timeout of exactly 8 000 ms.
4. IF the Composite_Job HTTP request has not received a response after 8 000 ms, THEN THE Gasp_Viewer SHALL abort the request and trigger the fallback defined in Requirement 5.

---

### Requirement 9: Correctness properties for property-based testing

**User Story:** As a developer, I want formally testable correctness properties for the composite pipeline, so that edge cases in video dimensions, durations, and layouts are caught automatically.

#### Acceptance Criteria

1. WHEN a request is sent to the Composite_Service with valid, reachable `reactionVideoUrl` and `gaspUrl` and a supported `layout`, THE Composite_Service SHALL return either HTTP 200 with a `compositeUrl` or a structured error (HTTP 4xx / 5xx with a machine-readable `code` field) within 10 000 ms.

2. WHEN the Composite_Service produces a composite video, THE output video SHALL have `width = 1 080` px and `height = 1 920` px, regardless of the input video dimensions.

3. WHEN the Composite_Service produces a composite video for a reaction video with `duration <= 30 s`, THE output video duration SHALL satisfy `|output.duration - reaction.duration| <= 0.5 s`.

4. WHEN the Composite_Service produces a composite video, THE output SHALL contain exactly one audio track whose content is derived from the reaction video audio.

5. WHEN the Composite_Service processes the same Composite_Job twice with identical `reactionVideoUrl`, `gaspUrl`, and `layout` inputs, BOTH responses SHALL have output videos satisfying `|duration_a - duration_b| <= 0.5 s` and identical pixel dimensions.

6. WHEN the Composite_Service receives a `layout` value that is not in the set `{ "1/3-2/3" }`, THE Composite_Service SHALL return HTTP 400 with error code `unsupported_layout`.

7. WHEN the Composite_Service receives a `reactionVideoUrl` or `gaspUrl` that resolves to a MIME type not in `{ video/mp4, video/quicktime, video/webm, image/jpeg, image/png, image/webp }`, THE Composite_Service SHALL return HTTP 422 with error code `invalid_media_type`.

8. WHEN the `buildCompositePayload(reactionVideoUrl, gaspUrl)` function is called with any fixed pair of string inputs, THE returned payload SHALL always have `layout = "1/3-2/3"`, regardless of call order or call count.
