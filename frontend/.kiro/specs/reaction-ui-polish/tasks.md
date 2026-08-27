# Implementation Plan: Reaction UI Polish

## Overview

Polish the existing Super Imposed Reaction UI so preview, chat, and playback all present the same `1/3 reaction + 2/3 original gasp` artifact. Preserve the existing recording, upload, and backend composite flow. Use `img-logs/2.jpeg` as the baseline to refine and `img-logs/3.jpeg` as the defect to eliminate.

## Tasks

- [x] 1. Extend `ReactionComposite` presentation props
  - [x] 1.1 Update `components/gasp/ReactionComposite.tsx`
    - Add optional props: `reactionLabel`, `originalLabel`, `showLabels`, `showDivider`, `watermarkMode`
    - Keep existing required props unchanged: `originalUri`, `originalMediaType`, `reactionVideoUri`
    - Preserve `flexDirection: 'row'`
    - Preserve reaction panel `flex: 1`
    - Preserve original gasp panel `flex: 2`
    - Add optional vertical divider
    - Add optional label overlays inside each panel
    - Default `showLabels` to `false`
    - Default `showDivider` to `true`
    - Default `watermarkMode` to `hidden`
    - Keep the component under approximately 200 lines; extract `PanelLabel` or media helpers if needed
    - Prefer NativeWind where practical, but use `StyleSheet.create` for absolute overlays and numeric media layout styles
    - _Requirements: 1.1, 1.2, 1.4, 2.3, 6.1_

  - [x]* 1.2 Update `components/__tests__/ReactionComposite.test.tsx`
    - Verify reaction panel keeps `flex: 1`
    - Verify original gasp panel keeps `flex: 2`
    - Verify labels render when `showLabels={true}`
    - Verify labels do not render when `showLabels` is omitted
    - Verify divider renders by default
    - _Requirements: 1.2, 1.4, 7.1_

- [x] 2. Polish `ReactionPreview`
  - [x] 2.1 Update `components/gasp/ReactionPreview.tsx`
    - Pass `reactionLabel="You"` to ReactionComposite
    - Pass `originalLabel={`${senderName}'s gasp`}` to ReactionComposite
    - Pass `showLabels`
    - Pass `showDivider`
    - Hide or soften the client-side watermark via `watermarkMode="hidden"` unless product asks to keep it
    - Improve Send loading state contrast while `isSending === true`
    - Keep Send primary, Re-record secondary, Discard low emphasis
    - Move any new user-facing strings to `locales/en.json`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.2, 6.3, 6.7_

  - [x]* 2.2 Update `components/__tests__/ReactionPreview.test.tsx`
    - Verify ReactionComposite receives the label props
    - Verify Send is disabled when `isSending`
    - Verify loading UI is visible when `isSending`
    - Verify Send is enabled when `isSending` is false or omitted
    - _Requirements: 2.3, 2.5, 7.2_

- [x] 3. Replace generic chat placeholder with composite thumbnail when possible
  - [x] 3.1 Update `components/chat/ReactionBubble.tsx`
    - Do not change the existing reply strip JSX structure
    - Keep the outer bubble structure stable; use a small helper for the media body if needed
    - If `resolvedOriginalUri` exists, render a compact composite thumbnail using ReactionComposite
    - Keep the existing generic gradient placeholder as fallback when original media is missing
    - Overlay a compact play affordance that does not hide the side-by-side structure
    - Keep `MediaBadge label="REACTION"` visible
    - Keep bubble alignment and spacing consistent with existing chat media styles
    - Extract helper components or shared styles if the file approaches 200 lines
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.9_

  - [x]* 3.2 Add or update ReactionBubble tests
    - Verify composite thumbnail renders when `replyToMessage` media exists
    - Verify generic placeholder renders when original media is missing
    - Verify pressing the bubble opens the modal
    - _Requirements: 4.1, 4.5, 7.3, 7.4_

- [x] 4. Fix full-screen playback modal layout
  - [x] 4.1 Update `components/chat/ReactionBubble.tsx` modal content
    - Render ReactionComposite in a full-screen or centered 9:16 frame with no unintended Dead_Space
    - Pass `showLabels`
    - Pass `reactionLabel="You"`
    - Pass a clear original label, e.g. `originalLabel="Gasp"` or `{otherParticipantName}'s gasp` when available
    - Keep close button safe-area aligned
    - Ensure media is not shifted outside the visible viewport
    - Avoid adding explanatory feature text
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

  - [x]* 4.2 Add modal playback tests
    - Verify modal renders ReactionComposite after press
    - Verify labels are enabled in modal playback
    - Verify close button dismisses modal
    - _Requirements: 3.3, 3.4, 7.5_

- [x] 5. Evaluate Preparing_State feasibility
  - [x] 5.1 Inspect chat/message optimistic state support
    - Check whether the existing React Query chat cache supports inserting a temporary local reaction message
    - Do not add server message data or loading flags to a Zustand store
    - If supported, add compact `Preparing reaction` bubble after upload success while composite is pending via React Query cache
    - If not supported, document that Preparing_State is deferred and keep current non-blocking navigation
    - Move `Preparing reaction` to `locales/en.json` if implemented
    - Decision: deferred for this pass. Existing chat messages are React Query server state and the current send flow runs the composite after navigation, outside a chat mutation with a safe optimistic lifecycle. Implementing this now would add fragile cache behavior beyond the UI polish scope.
    - _Requirements: 5.1, 5.2, 5.3, 6.7_

- [x] 6. Replace interruptive fallback alert if needed
  - [x] 6.1 Update composite fallback feedback in `hooks/useViewGasp.ts`
    - Prefer non-blocking toast-style feedback for composite fallback
    - Avoid alarming modal error language when the raw reaction fallback was sent successfully
    - Preserve Sentry capture and fallback send behavior
    - Use localized string keys for any new toast copy
    - _Requirements: 5.4, 5.5, 6.7_

  - [x] 6.2 Preserve original gasp reference when sending reaction messages
    - Include `replyToId` on raw reaction chat messages so the sender can resolve the original gasp in chat
    - Keep `replyToId` on any fallback reaction messages when the original message id is available
    - Keep raw-video playback as a graceful fallback only when the original gasp cannot be resolved
    - Image 18 follow-up: new reaction chat messages use the raw reaction video URL plus `replyToId`; the fullscreen modal composes raw reaction + original gasp client-side instead of playing the backend `/composites/` video as a single fallback.
    - Image 18 follow-up: backend message responses include `replyToMessage` for `replyToId` targets so the modal can resolve the original gasp even when it is not loaded in the current chat page.
    - Image 18/19 follow-up: the `/reactions/composite` backend job is no longer called in the primary send path; client playback is the source of truth for the side-by-side UI.
    - Image 18/19 follow-up: socket messages that arrive with `replyToId` but without `replyToMessage` invalidate the conversation messages query so the enriched backend response replaces incomplete cached data.
    - _Requirements: 1.2, 3.2, 4.1, 4.2, 5.4_

- [ ] 7. Manual visual QA against logged images
  - [ ] 7.1 Compare updated preview against `img-logs/2.jpeg`
    - Confirm the good structure remains
    - Confirm labels clarify the two panels
    - Confirm send loading state is readable
    - Confirm watermark/badge no longer competes with content
    - Status: pending live flow exercise. Source image reviewed; implementation and focused tests confirm the intended labels, hidden watermark, divider, and send loading state.
    - _Requirements: 2.1, 2.3, 2.5, 2.7, 7.6_

  - [ ] 7.2 Compare updated playback against `img-logs/3.jpeg`
    - Confirm no upper-left black Dead_Space
    - Confirm no shifted/offscreen panels
    - Confirm close button is safe-area aligned
    - Confirm full-screen playback matches preview grammar
    - Status: pending live modal screenshot. Source image reviewed; automated Simulator tap was blocked because `osascript` does not have Assistive Access on this machine.
    - Image 12/16 follow-up: playback modal now uses a tighter black header with labels aligned to the `1/3 + 2/3` panels, a taller portrait media frame, and autoplay playback.
    - Automated coverage verifies the playback modal uses the composite path, visible header labels, and a portrait `width: '100%'` frame instead of the generic placeholder.
    - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7, 7.6_

- [x] 9. Refine playback modal visual presentation
  - [x] 9.1 Update fullscreen playback modal only
    - Keep preview and chat thumbnails on the default `1/3 reaction + 2/3 original gasp` visual ratio
    - Use `45/55` split in fullscreen playback so the reaction face is more readable
    - Wrap the media in a centered rounded stage with overflow hidden
    - Move playback labels inside the rounded media stage over a subtle scrim
    - Add lightweight top context such as `{name} reacted`
    - Keep close as a floating safe-area button
    - Do not add play/progress/mute/share/reply controls in this pass
    - _Requirements: 1.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_

  - [x] 9.2 Update focused tests for modal presentation
    - Verify playback passes the `45/55` flex values to ReactionComposite
    - Verify playback renders top context and internal labels
    - Verify close still dismisses the modal
    - Latest result: focused feature suite `5 passed`, `43 passed`
    - _Requirements: 7.1, 7.5_

- [ ] 8. Final verification
  - [x] 8.1 Run focused tests for changed components
    - `components/__tests__/ReactionComposite.test.tsx`
    - `components/__tests__/ReactionPreview.test.tsx`
    - ReactionBubble tests if added
    - Latest result: `5 passed`, `39 passed`
    - ReactionBubble coverage includes composite thumbnail fallback behavior, raw-video fallback when original media is absent, and full-screen playback frame layout.
    - Latest after reply reference fix: `5 passed`, `42 passed`
  - [ ] 8.2 Run broader app test suite if time allows
    - Current result: full `npm test` is blocked by an existing Jest/ESM issue in `stores/__tests__/authStore.test.ts`; focused feature tests pass.
  - [x] 8.3 Test manually on at least one iOS simulator or device
    - iOS simulator build/install completed on iPhone 17 Pro Max
    - Smoke screenshot captured with the app open in a chat showing a `REACTION` bubble
    - Full preview/playback comparison remains tracked in task 7 because it requires exercising the live reaction recording and modal flow

## Notes

- Tasks marked with `*` are optional for a fast visual MVP but recommended before release.
- This spec intentionally avoids backend changes.
- This spec intentionally avoids changing the existing `layout: "1/3-2/3"` API contract.
- If video playback in chat thumbnails hurts performance, use a lightweight static-looking thumbnail and keep actual playback inside the modal.
- Respect the existing project note that `ReactionBubble.tsx` Android JSX is fragile; keep changes scoped and test manually on Android later if possible.
- Follow `gasp/CLAUDE.md`: React Query for server state, Zustand only for UI state, locale files for new user-facing strings, accessibility labels on all interactive elements, and small single-purpose components.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "1.2"] },
    { "id": 2, "tasks": ["3.1", "4.1", "2.2"] },
    { "id": 3, "tasks": ["3.2", "4.2", "5.1", "6.1"] },
    { "id": 4, "tasks": ["7.1", "7.2", "8.1", "8.2", "8.3"] }
  ]
}
```
