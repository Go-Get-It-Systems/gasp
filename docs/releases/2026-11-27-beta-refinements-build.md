# Beta refinements — main integration and iOS build

This record supersedes the earlier next-beta manifest's pending-merge status. Distribution remains a separate step.

## Integrated source

- App main: `a55b5c2f00b70f80cddc00c6edaf8dade9af7c43`.
- Backend main: `e19b3cc028f1da2dfaa273aff7e694b8b235a22a`.
- App reviews: Business likes and proportional media (#44), Business guidance navigation (#45), camera hold reliability (#46).
- API reviews: protected Business likes (#18), reaction reveal trimming (#19).
- Both repositories preserve `codex/recovery-before-beta-refinements-20261127` for the preceding main. Feature branches were preserved.
- All five reviews were merged only after their checks passed. GitHub's up-to-date-branch requirement was followed for each successive app merge.
- Both final main checks passed. The final trees matched the combined candidates: 638 app tests, 359 API unit/route tests, and 19 actual FFmpeg montage cases passed locally. Local database-dependent tests were skipped; GitHub's database/image checks passed.

## Build

- Clean detached checkout of the exact app main above; no local experiment or integration API override.
- Existing Firebase app configuration reused; existing signing certificate/profile for GASP's team reused with credential changes disabled.
- Profile/channel: `beta`; store distribution; runtime/app version: `1.1.0`; iOS build: `9`.
- API destination: `https://gasp-backend-production.up.railway.app`.
- EAS build: `bafb32db-0c98-4c25-b29c-f52376e7e5a9`.
- [Build on Expo](https://expo.dev/accounts/go-get-it-systems/projects/gasp/builds/bafb32db-0c98-4c25-b29c-f52376e7e5a9).
- Compilation finished successfully. EAS metadata matches the exact main commit, beta profile/channel and iOS 1.1.0 build 9. No auto-submit was used.
- Downloaded IPA verification: bundle `com.gasp.app`, version `1.1.0`, build `9`, minimum iOS `15.1`, 22125079 bytes.
- Artifact SHA-256: `eb6e5fca19e64b65ad91e7597c21fa45d41c9b30177372e561001481f350b945`.
- No Apple submission, tester invitation or TestFlight assignment was performed.

## API and distribution boundary

Production deployment triggers were read before merging and returned no automatic triggers. After the build finished, the owner explicitly authorized publishing the compatible API, separately from TestFlight. Main `e19b3cc028f1da2dfaa273aff7e694b8b235a22a` was deployed from a clean checkout as `c197ba89-2d9e-4646-99a2-6fd5a55fe936`, reaching SUCCESS. The health endpoint returned status ok. The prior reveal-only deployment `1fd424ef-d7fc-4e7f-b522-4bff456f70a3` remains the rollback reference.

The release includes the additive campaign-likes migration. A code rollback does not remove that table or its data; no destructive rollback was performed.

Post-deploy checks with the existing Bi and Iaco test accounts passed: ten brands visible, campaign listing, unauthorized likes blocked, like/unlike, duplicate-write idempotency, independent per-account liked state, anonymous media blocked and authorized media readable. Original like states were restored and temporary test-session tokens were deleted. These direct API checks do not replace final native validation of the combined package.

Before tester distribution, validate the final app/API pairing on matching devices/accounts, verify Apple's agreement status and manual test groups, then assign only the approved testers. Existing owner-reported device checks are recorded in the component release notes and next-beta manifest. No Apple submission, tester invitation or TestFlight assignment was performed.
