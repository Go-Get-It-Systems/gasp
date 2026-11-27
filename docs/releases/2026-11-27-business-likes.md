# Business likes — implementation for integration E2E

The standalone proposal was approved on the physical iPhone in Safari, including horizontal and vertical proportions. This is not yet native-app E2E approval.

The campaign viewer now displays a compact 20px muted heart under the media, right aligned with the count; the selected heart uses the approved light purple. The target remains at least 48px. The action is accessible and translated into English and Portuguese.

Authenticated API state uses React Query keys scoped to actor, login generation, workspace and campaign. A pending action is optimistic and blocks rapid duplicate taps. Failure restores the prior server state and offers explicit retry. PUT/DELETE are idempotent. Access denial disables writes and rechecks authorization; stale results after logout cannot update the next session. Loading failures do not display a fabricated zero count. Guests get no enabled like action.

Media in the public/received campaign viewer follows decoded dimensions at full content width, without stretching or additional padding. The composer retains its prior media sizing; personal reaction composition is unchanged. Existing videos with baked-in blur still contain that blur: reprocessing or republishing those assets is a separate step. New sources without padding demonstrate the approved result.

Local validation after the refresh fix: 629 tests across 99 suites passed; TypeScript and targeted lint passed. Added coverage for network failure/retry, rapid taps, access revocation, account and session changes, adapter validation and landscape/portrait metadata. API has separate persistence/access/concurrency tests.

The integration-only API deployment succeeded and anonymous likes requests were rejected. The user confirmed like/unlike persistence on reopening in the Bi simulator, separate ownership between Bi and Iaco, and like persistence on the physical iPhone using Iaco.

That E2E uncovered a stale count while another account changed its like. The viewer now refreshes every five seconds while focused and foregrounded, and on returning to the screen/app. It skips refresh during its own write, cancels older reads before a write, and stops automatic retry after an authorization denial. This is periodic refresh, not instantaneous socket delivery; network latency adds to the interval.

Agent-operated simulator check, 27 November: both simulators kept “Adidas Demo — teste com consentimento” open. Starting from two likes, removing Iaco's like updated Bi to one while preserving Bi's selected heart. Removing Bi's like then updated Iaco to zero with an unselected heart, without reopening either publication. Final test state: neither account likes this campaign. Seven focused hook tests, TypeScript and targeted lint passed, including foreground/focus return, paused refresh during writes, access denial and cleanup.

Remaining: physical-device confirmation of cross-account automatic refresh, and final native media-orientation/failure-path checks. No TestFlight submission, production deploy or main merge in this change. The compiled beta does not contain these updates.
