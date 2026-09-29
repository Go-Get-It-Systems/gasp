# Implementation Plan: Super Imposed Reaction

## Overview

Extend the reaction flow so the sender receives a server-side composited video (reaction left 1/3, gasp right 2/3) instead of a raw front-camera clip. The client records and uploads the reaction video as before, then calls `POST /reactions/composite`. A redesigned `ReactionComposite` component provides an optimistic side-by-side preview while the job runs. Navigation stays non-blocking throughout.

## Tasks

- [ ] 1. Extend `GaspSchema` with `imageUrl` CDN field
  - [ ] 1.1 Add `imageUrl: z.string()` to `GaspSchema` in `services/api/schemas/gasp.schema.ts`
    - Add the field alongside the existing `imageUri` field so the CDN URL survives the local media-cache replacement
    - Update `normalizePendingGasp` to populate `imageUrl` from `item.gasp.imageUrl`
    - Update `normalizeGasp` to populate `imageUrl` from `raw.imageUrl`
    - Update the `Gasp` TypeScript type (inferred automatically from the updated schema)
    - _Requirements: 2.5 — gaspUrl must be the remote CDN URL_

- [ ] 2. Create `compositeService.ts`
  - [ ] 2.1 Implement `buildCompositePayload` and `compositeReaction` in `services/compositeService.ts`
    - Define `CompositePayload` interface `{ reactionVideoUrl: string; gaspUrl: string; layout: '1/3-2/3' }`
    - Define `CompositeResult` interface `{ compositeUrl: string }`
    - Implement `buildCompositePayload(reactionVideoUrl, gaspUrl): CompositePayload` — always returns `layout: '1/3-2/3'`
    - Implement `compositeReaction(payload, signal): Promise<CompositeResult>` — calls `api.post('/reactions/composite', payload, { signal })`
    - Import `api` from `@/services/api`
    - _Requirements: 2.5, 4.1, 8.3_

  - [ ]* 2.2 Write property test for `buildCompositePayload` layout invariant
    - **Property 1: Composite payload always carries the fixed layout**
    - For any pair of non-empty URL strings, `buildCompositePayload` must return `layout === '1/3-2/3'`
    - Use `fc.string()` × 2, minimum 100 runs
    - File: `services/__tests__/compositeService.test.ts`
    - Tag: `// Feature: super-imposed-reaction, Property 1: buildCompositePayload layout invariant`
    - **Validates: Requirements 2.5, 9.8**

  - [ ]* 2.3 Write unit tests for `compositeReaction`
    - Verify `api.post` is called with `'/reactions/composite'`, the payload, and `{ signal }`
    - Verify the function rejects when the AbortSignal is aborted before the request resolves (mock axios to never settle, then abort the controller)
    - File: `services/__tests__/compositeService.test.ts`
    - _Requirements: 4.1, 8.3_

- [ ] 3. Redesign `ReactionComposite` to side-by-side layout
  - [ ] 3.1 Rewrite layout in `components/gasp/ReactionComposite.tsx`
    - Replace the fullscreen-background + PiP layout with a `flexDirection: 'row'` container
    - Reaction video: `flex: 1` left panel (fills height)
    - Original gasp: `flex: 2` right panel (fills height)
    - Remove `captureRef` and `forCapture` props from `ReactionCompositeProps` — they are no longer needed
    - Measure container width via `onLayout` and store in local state for watermark sizing
    - Watermark: `position: 'absolute'`, bottom-right, `width = containerWidth * 0.12`, `opacity = 0.7`
    - Keep existing `OriginalMedia` sub-component structure; update only the layout wrapper
    - _Requirements: 3.2, 3.3_

  - [ ]* 3.2 Write property test for watermark proportional width
    - **Property 4: Watermark size is proportional to component width**
    - For any `componentWidth` in `[100, 800]`, watermark `width` must equal `componentWidth * 0.12` (within floating-point tolerance) and `opacity` must equal `0.7`
    - Use `fc.integer({ min: 100, max: 800 })`, minimum 100 runs
    - Render the component in a test environment with a mocked `onLayout` event providing the width
    - File: `components/__tests__/ReactionComposite.test.tsx`
    - Tag: `// Feature: super-imposed-reaction, Property 4: Watermark width proportional to componentWidth`
    - **Validates: Requirements 3.3**

  - [ ]* 3.3 Write unit tests for `ReactionComposite` layout
    - Verify the container uses `flexDirection: 'row'`
    - Verify the reaction panel has `flex: 1` and renders on the left
    - Verify the gasp panel has `flex: 2` and renders on the right
    - Verify watermark is rendered with `opacity: 0.7` and `position: 'absolute'`
    - Verify the component no longer accepts `captureRef` or `forCapture` props (compile-time TypeScript check)
    - File: `components/__tests__/ReactionComposite.test.tsx`
    - _Requirements: 3.2, 3.3_

- [ ] 4. Update `reaction-result.tsx` to remove off-screen capture path
  - [ ] 4.1 Remove `captureRef`/`forCapture` usage from `app/(modals)/reaction-result.tsx`
    - Remove `captureViewRef`, `captureComposite` function, and the off-screen `<View style={styles.captureContainer}>` block that renders `ReactionComposite` at 1 080 × 1 920
    - Remove the `captureRef` and `forCapture` props from the remaining `ReactionComposite` call (inside `ReactionPreview`)
    - Remove the `react-native-view-shot` `captureRef` import if no longer used elsewhere in this file
    - For `handleSave` and `handleShare`: use `originalImageUri` directly; add a `// TODO: wire compositeUrl once available in screen params` comment
    - Remove the `captureContainer` style
    - _Requirements: constraint 5 — reaction-result captureRef/forCapture removal_

- [ ] 5. Add `isSending` prop to `ReactionPreview`
  - [ ] 5.1 Update `components/gasp/ReactionPreview.tsx`
    - Add `isSending?: boolean` to `ReactionPreviewProps`
    - When `isSending === true`: render `ActivityIndicator` instead of the `Send` icon; set `disabled` on the button; apply reduced opacity (e.g. `0.6`)
    - When `isSending === false` (default): render the existing `Send` icon; button is enabled at full opacity
    - Import `ActivityIndicator` from `react-native`
    - _Requirements: 2.3, 3.4_

  - [ ]* 5.2 Write unit tests for `ReactionPreview` sending states
    - Verify Send button is disabled and shows `ActivityIndicator` when `isSending={true}`
    - Verify Send button is enabled and shows `Send` icon when `isSending={false}` or prop is omitted
    - File: `components/__tests__/ReactionPreview.test.tsx`
    - _Requirements: 2.3_

- [ ] 6. Extend `useViewGasp` with composite send flow
  - [ ] 6.1 Add `gaspUrl` prop, `isSending` state, `compositeAbortControllerRef`, and helper functions to `useViewGasp`
    - Add `gaspUrl: string` to `UseViewGaspProps`
    - Add `const [isSending, setIsSending] = useState(false)`
    - Add `const compositeAbortControllerRef = useRef<AbortController | null>(null)`
    - Import `buildCompositePayload` and `compositeReaction` from `@/services/compositeService`
    - Add private `sendMessageWithRetry` helper inside the hook (not exported): retries `sendMessage` up to N times with the same `url` argument preserved across all attempts
    - Add private `showFallbackToast` helper: triggers the existing app toast with a 3 000 ms auto-dismiss and message "Enhanced reaction unavailable"
    - Expose `isSending` in the hook's return value
    - Note: the hook is ~150 lines currently; if it exceeds ~200 lines after this and the next two tasks, extract the async send logic into `hooks/useCompositeReaction.ts`
    - _Requirements: 2.1, 2.2, 4.2, 5.1, 5.2, 5.3, 6.2_

  - [ ] 6.2 Rewrite `handleSend` in `useViewGasp`
    - Replace the current `handleSend` with the corrected composite flow:
    - Synchronous part: `setIsSending(true)` only — do NOT call `router.back()` yet
    - Async flow:
      1. `uploadWithRetry(localUri, 'reactions', userId)` — if fails: `setIsSending(false)`, show upload error toast, return (ReactionPreview stays visible with Send re-enabled)
      2. On upload success: `removeFromQueue(bgQueueId)`, `setPreviewUri(null)`, `router.back()` (fires here, after upload, before composite)
      3. `new AbortController` with `setTimeout(abort, 8_000)`
      4. `compositeReaction(payload, signal)` — on success: `sendMessageWithRetry(conversationId, compositeUrl, messageId, 3)` with delays `[0ms, 500ms, 1500ms]`
      5. On composite HTTP error: `Sentry.captureException(e, { extra: { payload } })` → fallback `sendMessage(..., reactionVideoUrl)` → `showFallbackToast()`
      6. On composite timeout (AbortError): `Sentry.captureMessage('Composite job timed out', { extra: { durationMs: 8_000, payload } })` → fallback `sendMessage` → `showFallbackToast()`
      7. `finally`: `compositeAbortControllerRef.current = null`, `setIsSending(false)` (always reset)
    - `sendMessageWithRetry` helper retries `sendMessage` up to 3 times with delays `[0, 500, 1500]` ms, same `url` on all attempts
    - _Requirements: 2.2, 2.4, 3.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 8.3, 8.4_

  - [ ] 6.3 Rewrite `handleDiscard` in `useViewGasp`
    - New order: `router.back()` → `compositeAbortControllerRef.current?.abort()` → `compositeAbortControllerRef.current = null` → `removeFromQueue(bgQueueId)` → `closeViewMutation.mutate(gaspId)` (inbox mode only, guarded by `gaspIdRef.current`)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Write property and unit tests for the composite flow
  - [ ]* 8.1 Write property test for duration clamping
    - **Property 2: Reaction duration is clamped to MAX_REACTION_DURATION_S**
    - For any `holdDurationS` in `[1, 120]`, `Math.min(holdDurationS, 30)` must be `<= 30` and equal `holdDurationS` when `holdDurationS <= 30`
    - Use `fc.integer({ min: 1, max: 120 })`, minimum 100 runs
    - File: `hooks/__tests__/useViewGasp.compositeFlow.test.ts`
    - Tag: `// Feature: super-imposed-reaction, Property 2: duration clamping`
    - **Validates: Requirements 1.6**

  - [ ]* 8.2 Write property test for fallback URL preservation
    - **Property 5: Fallback always sends the exact reaction video URL**
    - For any `reactionVideoUrl`, when the composite call fails (simulate AbortError or HTTP error after a successful upload), `sendMessage` must be called with that exact URL as its `mediaUrl` argument
    - Use `fc.webUrl()`, `fc.oneof(fc.constant('timeout'), fc.constant('httpError'))`, minimum 100 runs
    - File: `hooks/__tests__/useViewGasp.compositeFlow.test.ts`
    - Tag: `// Feature: super-imposed-reaction, Property 5: fallback sends exact reactionVideoUrl`
    - **Validates: Requirements 5.1**

  - [ ]* 8.3 Write property test for `sendMessageWithRetry` URL preservation and backoff
    - **Property 6: sendMessageWithRetry preserves the same compositeUrl across all retry attempts with correct delays**
    - Tested **indirectly via `handleSend`**: mock `sendMessage` to always throw, mock `compositeReaction` to resolve with a fixed `compositeUrl`, then assert all `sendMessage` spy calls received the same `compositeUrl` and that the elapsed time between calls matches the `[0, 500, 1500]` ms backoff schedule (use `jest.useFakeTimers()`)
    - For any `compositeUrl` string, all retry attempts must pass the identical URL — not a mutated or re-fetched version
    - Use `fc.webUrl()`, minimum 100 runs
    - File: `hooks/__tests__/useViewGasp.compositeFlow.test.ts` (NOT compositeService.test.ts — this tests hook behavior)
    - Tag: `// Feature: super-imposed-reaction, Property 6: sendMessageWithRetry preserves compositeUrl with backoff`
    - **Validates: Requirements 4.2**

  - [ ]* 8.4 Write unit tests for `useViewGasp` composite flow
    - `handleRelease` calls `enqueueUpload` and stores the queue ID in `bgUploadQueueIdRef`
    - `handleSend` does NOT call `router.back()` immediately — it calls `uploadWithRetry` first
    - `handleSend` calls `removeFromQueue` only after `uploadWithRetry` resolves successfully
    - `handleSend` calls `router.back()` after upload succeeds, before composite dispatch
    - When upload fails: `setIsSending(false)` is called, `router.back()` is NOT called, ReactionPreview stays visible
    - `handleDiscard` calls `router.back()` first, then `abort()`, then `removeFromQueue`
    - `handleDiscard` calls `closeViewMutation.mutate` only when `gaspIdRef.current` is non-null
    - `isSending` is always reset to `false` in the `finally` block (success, composite error, composite timeout)
    - On composite HTTP error, `Sentry.captureException` is called with `payload` in `extra`
    - On composite timeout, `Sentry.captureMessage` is called with `durationMs` and `payload` in `extra`
    - File: `hooks/__tests__/useViewGasp.compositeFlow.test.ts`
    - _Requirements: 2.2, 2.4, 3.5, 4.1, 5.1, 5.3, 6.1, 6.2, 6.4_

- [ ] 9. Thread `gaspUrl` and `isSending` through `view-gasp.tsx`
  - [ ] 9.1 Update `app/(modals)/view-gasp.tsx`
    - Add `chatGaspUrl?: string` to the `useLocalSearchParams` type
    - Resolve `const gaspUrl = params.chatGaspUrl || gasp?.imageUrl || imageUri` (CDN URL first, local URI as last-resort fallback)
    - Pass `gaspUrl` to `useViewGasp({ ..., gaspUrl })`
    - Destructure `isSending` from `useViewGasp` return value
    - Pass `isSending` to `<ReactionPreview isSending={isSending} ... />` inside the `previewUri` block
    - _Requirements: 2.5 (gaspUrl threading), 2.3 (isSending display)_

- [ ] 10. Final checkpoint — wire-up verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` (`fc`), already in `devDependencies`
- `ReactionBubble.tsx` already calls `ReactionComposite` without `captureRef`/`forCapture` — no changes needed there
- If `useViewGasp.ts` exceeds ~200 lines after tasks 6.1–6.3, extract the async composite logic to `hooks/useCompositeReaction.ts`
- The `reaction-result.tsx` save/share path is simplified to use `originalImageUri`; a proper `compositeUrl`-based save strategy can be added as a follow-up once the backend URL is surfaced in screen params

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "6.2"] },
    { "id": 5, "tasks": ["6.3", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["9.1"] }
  ]
}
```
