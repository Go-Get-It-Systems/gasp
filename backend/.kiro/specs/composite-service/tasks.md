# Implementation Plan: Composite Service

## Overview

Add `POST /api/v1/reactions/composite` to the GASP backend. The endpoint downloads two input media assets (reaction video + gasp image/video), runs FFmpeg to produce a 1080×1920 side-by-side composite with the GASP watermark, uploads the result to Firebase Storage, and returns the CDN URL. The endpoint is synchronous — the client's AbortController provides the 8 000 ms deadline.

## Tasks

- [ ] 1. Add watermark asset and `composites` media type
  - [ ] 1.1 Add `assets/watermark.png` to the repository root
    - Copy the GASP logo PNG into `assets/watermark.png`
    - This file is referenced by the FFmpeg filtergraph at runtime
    - Commit the asset — it must be present in the Docker image
    - _Requirements: 3.5_

  - [ ] 1.2 Extend `MediaType` in `src/modules/uploads/uploads.service.ts`
    - Change `export type MediaType = 'gasps' | 'reactions' | 'avatars'`
    - To `export type MediaType = 'gasps' | 'reactions' | 'avatars' | 'composites'`
    - No other changes needed — `uploadStreamToStorage` already handles any `MediaType`
    - _Requirements: 4.2_

- [ ] 2. Create `composite.schemas.ts`
  - [ ] 2.1 Implement Zod schema in `src/modules/composite/composite.schemas.ts`
    - Define `SUPPORTED_LAYOUTS = ['1/3-2/3'] as const`
    - Define `compositeSchema` with:
      - `reactionVideoUrl: z.string().url().refine(isAllowedMediaUrl, ...)`
      - `gaspUrl: z.string().url().refine(isAllowedMediaUrl, ...)`
      - `layout: z.enum(SUPPORTED_LAYOUTS, { errorMap: ... })` — custom messages for `invalid_enum_value` and `invalid_type`
    - Export `CompositeInput = z.infer<typeof compositeSchema>`
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [ ] 3. Create `composite.service.ts`
  - [ ] 3.1 Implement `downloadInputs` helper in `src/modules/composite/composite.service.ts`
    - Accept `(tmpDir, reactionVideoUrl, gaspUrl)`
    - `fetch` each URL with `AbortSignal.timeout(10_000)`
    - On non-2xx response: throw `AppError(422, 'One or more input URLs could not be fetched', 'unreachable_input')`
    - Check `Content-Type` against allowed set `{ video/mp4, video/quicktime, video/webm, image/jpeg, image/png, image/webp }`
    - On disallowed MIME: throw `AppError(422, 'Unsupported media type: <mime>', 'invalid_media_type')`
    - Stream response body to disk using `pipeline(response.body, fs.createWriteStream(...))`
    - Return `{ reactionPath, gaspPath, isGaspImage }` where `isGaspImage = mime.startsWith('image/')`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Implement `runFFmpeg` helper
    - Accept `(tmpDir, reactionPath, gaspPath, isGaspImage)`
    - When `isGaspImage === true`: probe reaction duration via `ffprobe -v quiet -print_format json -show_streams <reactionPath>`, then add `-loop 1 -t <duration>` before the gasp input
    - Build the FFmpeg filtergraph:
      - `[0:v]scale=360:1920:force_original_aspect_ratio=decrease,pad=360:1920:(ow-iw)/2:(oh-ih)/2[rv]`
      - `[1:v]scale=720:1920:force_original_aspect_ratio=decrease,pad=720:1920:(ow-iw)/2:(oh-ih)/2[gv]`
      - `[rv][gv]hstack=inputs=2[stacked]`
      - `[2:v]format=rgba,colorchannelmixer=aa=0.7[wm]`
      - `[stacked][wm]overlay=W-w-16:H-h-16[out]`
    - Map: `-map "[out]" -map 0:a?`
    - Encode: `-c:v libx264 -preset fast -crf 23 -r 30 -c:a aac -b:a 128k -movflags +faststart`
    - Watermark input: `path.resolve('assets/watermark.png')`
    - Output: `path.join(tmpDir, 'output.mp4')`
    - Wrap `spawn('ffmpeg', [...])` in a Promise; reject on non-zero exit code with `AppError(500, 'FFmpeg processing failed', 'COMPOSITE_FAILED')`
    - Log FFmpeg stderr to Fastify logger (pass logger as parameter)
    - Return `outputPath`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ] 3.3 Implement `createComposite` (exported main function)
    - Signature: `async function createComposite(reactorId: string, input: CompositeInput, log: FastifyBaseLogger): Promise<{ compositeUrl: string }>`
    - Create `tmpDir` via `fs.mkdtemp(path.join(os.tmpdir(), 'composite-'))`
    - Call `downloadInputs` → call `runFFmpeg` → call `uploadStreamToStorage`
    - Wrap everything in `try/catch/finally`; `finally` calls `fs.rm(tmpDir, { recursive: true, force: true })`
    - On each error type, call `Sentry.captureException(e, { extra: { reactionVideoUrl, gaspUrl, step }, tags: { feature: 'composite-service' } })`
    - Re-throw errors so the route handler returns the correct HTTP status via the global error handler
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Create `composite.routes.ts`
  - [ ] 4.1 Implement route in `src/modules/composite/composite.routes.ts`
    - Register `authMiddleware` via `app.addHook('preHandler', authMiddleware)`
    - Apply `messageRateLimit` on the POST handler
    - Perform manual layout validation BEFORE `compositeSchema.parse()`:
      - If `layout` is absent → `reply.status(400).send({ error: 'missing_layout', message: 'layout is required' })`
      - If `layout` is not in `SUPPORTED_LAYOUTS` → `reply.status(400).send({ error: 'unsupported_layout', message: "Only layout '1/3-2/3' is supported" })`
    - Call `createComposite(request.user.userId, input, request.log)`
    - Return `reply.send({ compositeUrl })`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.8_

- [ ] 5. Register route in `src/index.ts`
  - [ ] 5.1 Import and register `compositeRoutes`
    - Add `import { compositeRoutes } from './modules/composite/composite.routes.js'`
    - Inside the `/api/v1` prefix block, after `reactionsRoutes`, add:
      `await api.register(compositeRoutes, { prefix: '/reactions' })`
    - This registers the route as `POST /api/v1/reactions/composite`
    - _Requirements: 1.1_

- [ ] 6. Update `Dockerfile`
  - [ ] 6.1 Add FFmpeg to the runtime stage
    - After `FROM node:22-alpine` in the runtime stage, add `RUN apk add --no-cache ffmpeg`
    - Add `COPY --from=builder /app/assets ./assets` to copy the watermark into the image
    - Verify `ffmpeg -version` includes `libx264` and `aac` in the build output
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 7. Write tests
  - [ ] 7.1 Write unit tests for `composite.service.ts`
    - File: `src/modules/composite/__tests__/composite.service.test.ts`
    - Mock `fetch`, `fs`, `child_process.spawn`, `uploadStreamToStorage`, `Sentry`
    - Test cases:
      - `downloadInputs` returns `isGaspImage: true` for `image/jpeg` and `false` for `video/mp4`
      - `downloadInputs` throws `unreachable_input` on 404 response
      - `downloadInputs` throws `invalid_media_type` on `Content-Type: text/plain`
      - `runFFmpeg` builds correct args for video+video (no `-loop`)
      - `runFFmpeg` builds correct args for image+video (with `-loop 1 -t <duration>`)
      - `runFFmpeg` rejects when FFmpeg exits with code 1
      - `createComposite` calls `fs.rm` in `finally` even when FFmpeg fails
      - `createComposite` calls `Sentry.captureException` with correct `step` tag on each failure type
    - _Requirements: 2.1, 2.2, 2.3, 3.3, 3.10, 4.4, 6.1, 6.2, 6.3_

  - [ ] 7.2 Write route tests for `composite.routes.ts`
    - File: `src/modules/composite/__tests__/composite.routes.test.ts`
    - Use Fastify `app.inject()` with mocked `createComposite`
    - Test cases:
      - Returns 400 `missing_layout` when `layout` is absent
      - Returns 400 `unsupported_layout` when `layout` is `"full"`
      - Returns 400 `VALIDATION_ERROR` when URL is not from approved storage
      - Returns 200 `{ compositeUrl }` when service resolves
      - Returns 422 when service throws with code `unreachable_input`
      - Returns 500 when service throws with code `COMPOSITE_FAILED`
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 2.2, 3.10_

- [ ] 8. Checkpoint — run all tests and typecheck
  - Run `npm run test:run` — all tests must pass
  - Run `npm run typecheck` — zero new TypeScript errors
  - If tests fail, fix before continuing

## Notes

- The `compositeRoutes` prefix is `/reactions` (same as `reactionsRoutes`), so the full path is `POST /api/v1/reactions/composite`. Fastify resolves exact static routes before parametrised ones — no collision with `GET /reactions/gasps/:gaspId`.
- `assets/watermark.png` must be a real PNG. If the asset is not available yet, a 1×1 transparent PNG placeholder is acceptable for tests, but production composites will lack the watermark until the real asset is added.
- FFmpeg's `colorchannelmixer=aa=0.7` sets the alpha channel of the watermark to 70% opacity before the `overlay` filter. If the PNG already has an alpha channel, this multiplies against it.
- The `0:a?` map (with `?`) makes audio optional — if the reaction video has no audio track, FFmpeg skips the audio stream instead of erroring.
- For Railway deployments: `node:22-alpine` + `apk add --no-cache ffmpeg` adds approximately 70 MB to the image. This is within the 80 MB budget (Requirement 7.3).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["5.1", "6.1"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["8"] }
  ]
}
```
