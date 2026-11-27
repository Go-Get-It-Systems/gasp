# Business likes — implementation for integration E2E

The standalone proposal was approved on the physical iPhone in Safari, including horizontal and vertical proportions. This is not yet native-app E2E approval.

The campaign viewer now displays a compact 20px muted heart under the media, right aligned with the count; the selected heart uses the approved light purple. The target remains at least 48px. The action is accessible and translated into English and Portuguese.

Authenticated API state uses React Query keys scoped to actor, login generation, workspace and campaign. A pending action is optimistic and blocks rapid duplicate taps. Failure restores the prior server state and offers explicit retry. PUT/DELETE are idempotent. Access denial disables writes and rechecks authorization; stale results after logout cannot update the next session. Loading failures do not display a fabricated zero count. Guests get no enabled like action.

Media in the public/received campaign viewer follows decoded dimensions at full content width, without stretching or additional padding. The composer retains its prior media sizing; personal reaction composition is unchanged. Existing videos with baked-in blur still contain that blur: reprocessing or republishing those assets is a separate step. New sources without padding demonstrate the approved result.

Local validation: 627 tests across 99 suites passed; TypeScript and targeted lint passed. Added coverage for network failure/retry, rapid taps, access revocation, account and session changes, adapter validation and landscape/portrait metadata. API has separate persistence/access/concurrency tests.

Next: integration-only API deployment and simulator/device E2E. Test like → leave/reopen → unlike; confirm another account has its own state; check failure retry, campaign access and both media orientations. No TestFlight submission, production deploy or main merge in this change. The compiled beta does not contain these updates.
