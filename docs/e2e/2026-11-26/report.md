# Core E2E — 26 November 2026

Status: PASS for the tested core flow: send → physical capture → preview → reaction delivery → sender playback. User confirmed the visible REC indicator and advancing timer, original audio during capture, and own voice in preview. Coverage is scoped to the evidence below; this is not a release-wide approval. First audio attempt was inaudible; retest passed without code changes after user checked possible AirPods routing and raised volume. Root cause of first attempt remains unproven.

App: `codex/reaction-fullscreen-vertical`, `1be1b23`. No application code changed in this run. Metro restarted with cache clear on port 8083. Sender profile verified as Bi on iPhone 17 Pro simulator; receiver profile verified as Iaco on iPhone 17 Pro Max simulator. User reports Iaco logged in on attached iPhone 15 Pro. User explicitly authorized entering the supplied test credentials; credentials are not stored here.

## Automated gate

PASS: contract, full suite (484 tests / 73 suites), typecheck, lint. Logs: `/tmp/gasp-e2e-20261126/{flow-contract,full-suite,typecheck,lint}.log`.

## Simulator evidence

- Photo sent successfully: upload 200, batch 201. Receiver showed one pending gasp from Bi.
- Early release: hold at `1795651016291`, release at `1795651017806`, `revealed=false` (1,515 ms). UI remained blurred with no alert. No server open/close during that interval.
- A subsequent hold occurred outside the recorded controlled action; it revealed and consumed this first photo. This execution is not used as frame-level evidence.
- Fresh controlled photo hold: reveal 3,066 ms after hold start; one server open 200, no-clip on completion, expected Recording failed alert, dismissal returned to list with no pending gasp. Server close-view 200 after dismissal.
- Photo recording: `/tmp/gasp-e2e-20261126/photo-full-hold.mp4`. Frames extracted every 0.1 s; bundled detector reports **0 of 499 frames show REC**. This is sampled evidence, not a guarantee against every sub-frame flash.
- Fresh video: upload 200, batch 201. Reveal 3,044 ms after hold start; playback trace 61 ms after reveal. Contact sheet shows countdown followed by advancing media clock (first sampled visible frame 0.3 s through 9.3 s), then expected no-camera alert. One open 200 and close-view 200 after dismissal.
- Video recording/contact sheet: `/tmp/gasp-e2e-20261126/video-full-hold.mp4`, `/tmp/gasp-e2e-20261126/video-sheet.jpg`.

## Contract coverage so far

PASS below is scoped to the evidence stated; physical subcases are not implied.

| Rule | Status | Evidence / remaining coverage |
|---|---|---|
| C1 consume at reveal | PASS | Gate and simulator traces / server calls. Retry edge cases covered by gate, not induced in production. |
| C2 early release | PASS | Blurred UI, release before countdown, no open/close in interval; gate. |
| C3 record during countdown | PASS | Physical trace: camera ready +64 ms, record +331 ms, reveal +3048 ms; first attempt, 267 ms settle, recording 2717 ms before reveal. |
| C4 truthful REC | PASS | Simulator failure-path sample passed. Physical trace proves recording during countdown; user explicitly confirmed REC appeared and timer advanced correctly. Exact rendered timer value at reveal was not independently frame-measured. |
| C5 release / preview | PASS | Physical preview 113 ms after release; user completed and sent. Simulator no-clip alert/dismissal also passed. |
| C6 composite offset | PASS | Retest offset 2718 ms. Sender playback recording shows face first, original clock starts after approximately 2.7 s and advances to end. Contact sheet samples at 0.5 s; not frame-accurate lip-sync measurement. |
| C7 final reacted status | PASS | Trace reaction-delivered via reactions; server composite 200, reactions 201, no close-view in observed interval. Sender latest moment shows 1 opened / 1 reaction, latest Iaco reaction appears in chat and plays. Verified through API responses and UI, not direct database access. |
| C8 upload / delivery failures | PASS | Automated gate only; no failure injected into production. |
| C9 playback audio during capture | PASS | On retest user explicitly heard original audio while recording and in preview. User subsequently explicitly confirmed AirPods validation also passed. Actual native route was not instrumented; AirPods result is user-reported. |
| C10 selfie image and voice | PASS | User explicitly confirmed own voice in latest preview; sender playback visually shows moving front-camera face. Received audio track was not independently listened to by the agent. |

## Next step

Core retest completed. Audio passed without code changes; do not modify the native audio patch based on the first ambiguous observation. User explicitly confirmed AirPods validation also passed; B-009 closed by validation, without claiming a code fix or proven cause for the first attempt. Historical intermittent upload TLS issue is not declared resolved by this successful run. Backend composition remains the legacy side-by-side layout; vertical server composition is a separate pending change. No app code, native build, or deployment changed during this run. Distribution/release preparation remains separate from this core test.

## Physical retest evidence

- `physical-audio-retest.log`: record starts 324 ms after hold; 255 ms after camera ready; reveal +3042 ms; preview 120 ms after release; reaction delivered 31.835 s after hold (6.21 s after upload completed).
- HTTP: open 200 at 00:12:50 UTC, upload 200, composite 200 at 00:13:18 UTC, reactions 201 at 00:13:19 UTC; no close-view in that interval.
- Sender playback `/tmp/gasp-e2e-20261126/received-composite.mp4`, `/tmp/gasp-e2e-20261126/received-sheet.jpg`: original held dark before reveal offset, then clock advances 0.3 to 9.3 s alongside moving selfie. Closed video after checking; sender left in Iaco chat.
- User explicitly confirmed original sound during capture and own recorded voice in preview. Earlier spoken claim that agent independently verified received audio was not supported by an audio-capable observation; only the visual playback and user testimony support the checks above.
