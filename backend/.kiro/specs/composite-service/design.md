# Design Document: Composite Service

## Overview

The Composite Service adds `POST /api/v1/reactions/composite` to the GASP backend. It is a **synchronous** endpoint — the HTTP response is held open while FFmpeg processes the video. This matches the client's AbortController pattern (8 000 ms timeout): the server either responds within the budget or the client aborts.

The endpoint follows the existing module pattern: `composite.schemas.ts → composite.service.ts → composite.routes.ts`.

### Key decisions

- **Synchronous, not queued.** Unlike notifications or webhooks (BullMQ workers), composites are synchronous because the client waits for the `compositeUrl` before calling `sendMessage`. Async via queue would require polling or WebSocket push — unnecessary complexity for MVP.
- **FFmpeg via `child_process.spawn`.** No FFmpeg npm wrapper needed. Direct `spawn` gives full control over the filtergraph and keeps dependencies minimal.
- **Streaming downloads to disk.** Input videos can be up to ~50 MB. `pipeline(fetchResponse.body, fs.createWriteStream(...))` avoids buffering everything in memory.
- **Reuse `uploadStreamToStorage`.** The existing uploads service already handles Firebase Storage. We add `'composites'` to `MediaType` rather than duplicating upload logic.

---

## Architecture

### Request flow

```
Client
  │
  │ POST /api/v1/reactions/composite
  │ { reactionVideoUrl, gaspUrl, layout: "1/3-2/3" }
  ▼
composite.routes.ts
  ├── authMiddleware (JWT)
  ├── Zod schema validation → 400 on invalid
  └── compositeService.createComposite(reactorId, payload)
        │
        ├── 1. mkdtemp /tmp/composite/<id>/
        │
        ├── 2. downloadInputs()
        │       ├── fetch reactionVideoUrl → reaction.mp4
        │       └── fetch gaspUrl         → gasp.(mp4|jpg|png|…)
        │       └── validate MIME types
        │
        ├── 3. runFFmpeg()
        │       └── spawn ffmpeg -i reaction -i gasp -i watermark
        │                        [filtergraph: scale+pad+hstack+overlay]
        │                        -c:v libx264 -preset fast -r 30
        │                        -c:a aac -b:a 128k
        │                        output.mp4
        │
        ├── 4. uploadStreamToStorage(output.mp4, 'composites', reactorId)
        │       └── → compositeUrl (Firebase CDN URL)
        │
        └── 5. finally: rm -rf tmp_dir
  │
  ▼
{ compositeUrl }   HTTP 200
```

### Error flow

```
download fail  → HTTP 422 unreachable_input / invalid_media_type
ffmpeg fail    → HTTP 500 COMPOSITE_FAILED
upload fail    → HTTP 500 INTERNAL_ERROR (generic handler)
invalid layout → HTTP 400 unsupported_layout
missing layout → HTTP 400 missing_layout
```

---

## Module Structure

```
src/modules/composite/
  composite.schemas.ts   # Zod input validation
  composite.service.ts   # Download + FFmpeg + upload logic
  composite.routes.ts    # Fastify route registration
```

---

## Components and Interfaces

### `composite.schemas.ts`

```typescript
import { z } from 'zod';
import { isAllowedMediaUrl } from '../../shared/url-validator.js';

export const SUPPORTED_LAYOUTS = ['1/3-2/3'] as const;
export type SupportedLayout = typeof SUPPORTED_LAYOUTS[number];

export const compositeSchema = z.object({
  reactionVideoUrl: z.string().url().refine(isAllowedMediaUrl, 'URL must be from approved storage'),
  gaspUrl: z.string().url().refine(isAllowedMediaUrl, 'URL must be from approved storage'),
  layout: z.enum(SUPPORTED_LAYOUTS, {
    errorMap: (issue) => {
      if (issue.code === 'invalid_enum_value') {
        return { message: "Only layout '1/3-2/3' is supported" };
      }
      return { message: 'layout is required' };
    },
  }),
});

export type CompositeInput = z.infer<typeof compositeSchema>;
```

> **Note on missing `layout`:** Zod throws `invalid_type` (not `invalid_enum_value`) when the field is absent. The route handler detects this and returns `missing_layout` specifically.

### `composite.service.ts`

```typescript
export interface CompositeResult {
  compositeUrl: string;
}

export async function createComposite(
  reactorId: string,
  input: CompositeInput,
): Promise<CompositeResult>
```

Internal helpers (not exported):

```typescript
async function downloadInputs(
  tmpDir: string,
  reactionVideoUrl: string,
  gaspUrl: string,
): Promise<{ reactionPath: string; gaspPath: string; isGaspImage: boolean }>

async function runFFmpeg(
  tmpDir: string,
  reactionPath: string,
  gaspPath: string,
  isGaspImage: boolean,
): Promise<string>   // returns outputPath

function extFromMime(mime: string): string
```

### `composite.routes.ts`

```typescript
export async function compositeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', messageRateLimit, async (request, reply) => {
    // Custom layout validation before Zod to return structured errors
    const body = request.body as Record<string, unknown>;

    if (!('layout' in body) || body.layout === undefined) {
      return reply.status(400).send({ error: 'missing_layout', message: 'layout is required' });
    }
    if (!SUPPORTED_LAYOUTS.includes(body.layout as SupportedLayout)) {
      return reply.status(400).send({ error: 'unsupported_layout', message: "Only layout '1/3-2/3' is supported" });
    }

    const input = compositeSchema.parse(body);
    const { compositeUrl } = await compositeService.createComposite(
      request.user.userId,
      input,
    );
    return reply.send({ compositeUrl });
  });
}
```

---

## FFmpeg Filtergraph

For a **video gasp**:

```
ffmpeg \
  -i reaction.mp4 \
  -i gasp.mp4 \
  -i watermark.png \
  -filter_complex "
    [0:v]scale=360:1920:force_original_aspect_ratio=decrease,
         pad=360:1920:(ow-iw)/2:(oh-ih)/2[rv];
    [1:v]scale=720:1920:force_original_aspect_ratio=decrease,
         pad=720:1920:(ow-iw)/2:(oh-ih)/2[gv];
    [rv][gv]hstack=inputs=2[stacked];
    [2:v]format=rgba,colorchannelmixer=aa=0.7[wm];
    [stacked][wm]overlay=W-w-16:H-h-16[out]
  " \
  -map "[out]" \
  -map 0:a? \
  -c:v libx264 -preset fast -crf 23 -r 30 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

For an **image gasp** (add `-loop 1 -t <reactionDuration>` before the gasp input):

```
ffmpeg \
  -i reaction.mp4 \
  -loop 1 -t <reactionDuration> -i gasp.jpg \
  -i watermark.png \
  [same filter_complex] \
  output.mp4
```

### Getting reaction duration (needed for image gasp)

```
ffprobe -v quiet -print_format json -show_streams reaction.mp4
→ streams[0].duration (string, seconds)
```

---

## Data Models

### Input (validated by Zod)

```typescript
{
  reactionVideoUrl: string;  // Firebase CDN URL of reaction video
  gaspUrl: string;           // Firebase CDN URL of gasp (video or image)
  layout: '1/3-2/3';        // Only supported value
}
```

### Output

```typescript
{
  compositeUrl: string;  // Firebase CDN URL of merged output video
}
```

### `MediaType` update in `uploads.service.ts`

```typescript
// Before
export type MediaType = 'gasps' | 'reactions' | 'avatars';

// After
export type MediaType = 'gasps' | 'reactions' | 'avatars' | 'composites';
```

---

## Infrastructure Changes

### `Dockerfile`

Add FFmpeg to the **runtime stage** only (not builder):

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
# Install FFmpeg (adds ~70 MB to the runtime image)
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/db/migrations ./src/db/migrations
# Copy watermark asset
COPY --from=builder /app/assets ./assets
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Watermark asset

Create `assets/watermark.png` — the GASP logo PNG used in the filtergraph overlay. This must be committed to the repo so it is available at runtime.

### `src/index.ts` — register new route

```typescript
import { compositeRoutes } from './modules/composite/composite.routes.js';

// In the /api/v1 prefix block, after reactionsRoutes:
await api.register(compositeRoutes, { prefix: '/reactions' });
// → registered as POST /api/v1/reactions/composite
```

> **Note:** Fastify matches exact routes before parameterised ones, so `POST /reactions/composite` will not conflict with `POST /reactions/gasps/:gaspId`.

---

## Error Handling Table

| Scenario | HTTP Status | `error` field | Sentry |
|---|---|---|---|
| `layout` absent | 400 | `missing_layout` | No |
| `layout` not `"1/3-2/3"` | 400 | `unsupported_layout` | No |
| URL not from approved storage | 400 | `VALIDATION_ERROR` (Zod) | No |
| URL unreachable / non-2xx | 422 | `unreachable_input` | Yes (`step: download`) |
| MIME type not allowed | 422 | `invalid_media_type` | Yes (`step: download`) |
| FFmpeg non-zero exit | 500 | `COMPOSITE_FAILED` | Yes (`step: ffmpeg`, stderr) |
| Firebase upload fails | 500 | `INTERNAL_ERROR` | Yes (`step: upload`) |

---

## Tmp Directory Lifecycle

```
createComposite() called
  │
  ├── fs.mkdtemp(path.join(os.tmpdir(), 'composite-')) → tmpDir
  │
  ├── [all work happens inside tmpDir]
  │
  └── finally:
        fs.rm(tmpDir, { recursive: true, force: true })
          → runs on success, FFmpeg error, download error, upload error
```

This guarantees no orphaned temp files accumulate on the server, even if the process is interrupted mid-way.

---

## Testing Strategy

### Unit tests (`src/modules/composite/__tests__/`)

**File: `composite.service.test.ts`** (Vitest)

- `downloadInputs` returns correct paths and `isGaspImage` flag for each MIME type
- `downloadInputs` throws with `unreachable_input` when fetch returns 404
- `downloadInputs` throws with `invalid_media_type` when `Content-Type` is `text/plain`
- `runFFmpeg` calls `spawn` with the correct arguments for video+video and image+video combos
- `runFFmpeg` rejects when FFmpeg exits with code 1
- `createComposite` cleans up `tmpDir` even when FFmpeg fails (spy on `fs.rm`)
- `createComposite` calls `uploadStreamToStorage` with `type: 'composites'`

**File: `composite.routes.test.ts`** (Vitest + Fastify inject)

- Returns 400 `missing_layout` when `layout` is absent
- Returns 400 `unsupported_layout` when `layout` is `"full"`
- Returns 400 `VALIDATION_ERROR` when `reactionVideoUrl` is not from approved storage
- Returns 200 `{ compositeUrl }` when service resolves (mocked `createComposite`)
- Returns 422 when service throws `unreachable_input`
- Returns 500 when service throws `COMPOSITE_FAILED`

### Integration tests (optional, run in CI with FFmpeg available)

- End-to-end: real `.mp4` reaction + `.jpg` gasp → output has `width=1080`, `height=1920`
- Audio track preserved from reaction video
- Image gasp looped for reaction duration ± 0.5 s
