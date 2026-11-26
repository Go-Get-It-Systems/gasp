# Reaction preview — checkpoint, 23 October 2026

## Versioned implementation

- Working branch: `codex/reaction-fullscreen-vertical`.
- Previous implementation preserved at `codex/reaction-layout-before-fullscreen` (`584e3c3`).
- Latest layout commit: `7cd9d6d`.
- Preview occupies the full display, including the region around the Dynamic Island, with controls inside the safe area.
- Original gasp above the reaction, equal vertical halves, separated by a subtle dark one-point line.
- Small context text at top left, without a card.
- White send and discard icons on transparent backgrounds, below the midpoint on the right; their centers align with the watermark and their visible gaps are equal.
- Discard requires confirmation. Sending currently displays a spinner and disables the primary actions.

## Physical-device validation

User tested on iPhone 15 Pro as Iaco, receiving synthetic photo gasps from Bi.
User approved the full-screen edges, divider, reduced title, transparent actions, alignment and spacing.
In the latest bright-window/background capture, the user confirmed that both icons remain easy to identify and approved the contrast. Keep the existing shadow.
This is user-observed visual validation; it does not certify every E2E scenario.

The latest test gasp was confirmed by the sender UI as sent to Iaco after a connection error on the first attempt and a successful retry. The user then confirmed the reaction preview was open. No send/discard of that reaction was requested after the contrast check.

## Resume here

1. Confirm whether the preview is still open before requesting another capture.
2. Validate icon contrast over dark backgrounds and movement; those cases remain pending.
3. Inspect and test send feedback and synchronous protection against double taps. The existing React-state guard has not yet been strengthened or verified against same-render repeated calls.
4. Validate framing with different faces and media.
5. After frontend validation, address server video composition. It still uses the previous side-by-side layout; this checkpoint does not change the backend.

Intermittent upload connection/TLS failures remain unresolved (B-008). A successful retry is not evidence of a fix.

## Recorded checks

Earlier layout validation: 483 tests passed, plus typecheck and lint (existing warnings only).
Latest alignment refinement: 20 targeted preview/composite tests passed, plus typecheck and lint.
This checkpoint only adds documentation; no runtime code changed during the contrast validation.
