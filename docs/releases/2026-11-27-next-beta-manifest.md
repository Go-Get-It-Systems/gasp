# Next beta — versioned change set

Status: source changes saved on review branches; not a compiled or distributed beta. The owner requested versioning after confirming Go to Gasps on the physical iPhone, including the subsequently reported camera hold issue, now corrected and confirmed by the owner on the physical iPhone.

## Included changes

| Component | Review | Verified source revision | Purpose |
| --- | --- | --- | --- |
| App | [Add Business campaign likes and proportional media](https://github.com/Go-Get-It-Systems/gasp/pull/44) | `08ba8a27742b45465f85917cf07e7130188b79e3` | Persistent per-user likes, undo, proportional media, five-second foreground count refresh |
| App | [Fix Business guidance navigation between tabs](https://github.com/Go-Get-It-Systems/gasp/pull/45) | implementation `e143b64`; evidence updates on the same review branch | Go to Gasps, Explore brands and mandatory test-environment alignment |
| App | [Fix camera recording hold sensitivity](https://github.com/Go-Get-It-Systems/gasp/pull/46) | implementation `f01e8e6`; physical evidence `233e0db` | Stable capture target, movement tolerance and no photo on cancelled tap |
| API | [Add protected Business campaign likes](https://github.com/Go-Get-It-Systems/gasp-backend/pull/18) | `d10c19ff8da5a5a7e664313ec33bd63eb9959ad3` | Authenticated access, unique per-user likes, idempotent writes and counts |

The first three reviews were open and mergeable when checked. The camera correction was added afterward; its current CI and mergeability must also be checked before integration. App likes and API checks passed on the listed revisions. Navigation CI was still running; verify its final result on the latest revision before integration.

## Recorded device validation

- Likes persisted after reopening, and removing Iaco's like did not remove Bi's like.
- Two open simulators updated counts in both directions while preserving each account's selected state.
- The owner subsequently confirmed the same count changes on the physical iPhone without reopening the publication: one, then zero. This supersedes the earlier pending cross-account refresh note in the likes implementation report. Refresh is periodic (five seconds plus network latency), not socket-based instantaneous delivery.
- Go to Gasps opened the inbox from the Discover card and Business profile in the simulator. The owner also confirmed the fix on the physical iPhone.
- Explore brands has automated coverage; its native empty state has not been exercised in this round because the account already follows brands.
- The owner confirmed that the camera hold now works on the physical iPhone after testing the instructed hold with slight movement. The camera branch passed 623 tests, TypeScript and targeted ESLint. Other hardware edge cases are distinguished in its release record.
- General native media-orientation/failure-path checks remain as noted in the likes report; these are not implicitly completed by navigation testing.

## Environment boundaries

Likes E2E used the isolated integration API. The later ten-brand content review and navigation fix used the beta-content API at `https://gasp-backend-production.up.railway.app`. The two simulators and physical iPhone were aligned to the same development preview for that later review. The beta-content API has not received the new likes API through this work.

Before final beta validation, combine the reviewed app changes and use one compatible backend/environment for every participating device. Check app source revision and loaded development bundle, API destination/backend revision and test account. A common Firebase project does not imply shared API data.

## Remaining release steps

1. Include the camera hold correction through its own tested review; the owner has confirmed the originally reported scenario on the iPhone.
2. Verify current checks and the combined change set; inspect backend deployment triggers before an authorized merge.
3. Integrate reviewed changes into main, then verify the resulting main commit.
4. Compile the official beta only from that clean, verified main commit. Assign the next build number at compilation; do not label this document as a new binary.
5. Coordinate the compatible API deployment separately, then verify final app/API behavior before assigning the build only to authorized testers.

No main merge, final beta compilation, Apple submission or tester distribution was performed for this manifest. Existing recovery references remain untouched. A source rollback does not reverse database/storage changes.
