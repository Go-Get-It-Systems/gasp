---
name: gasp-core-e2e
description: End-to-end validation of GASP's core flow (send a gasp, hold to view, record the reaction, composite, server status) against docs/gasp-view-contract.md. Use before opening or merging any PR that touches view-gasp, useViewGasp, the reaction/composite pipeline or the gasp status endpoints, after a redesign of those screens, or whenever the user asks to "test the core end to end".
---

# GASP core end-to-end

Validates the contract in `docs/gasp-view-contract.md` (rules C1–C10) in three
layers. Run them in order and stop at the first layer that fails: fix, then
restart from layer 1. Finish with the report described at the end.

| Layer | Who | Proves |
|---|---|---|
| 1. Gate | you, alone | C1–C8 in code (flow test), suite, types, lint |
| 2. Simulator ↔ simulator | you, alone | send, receive, early release (C2), reveal + consume (C1), recording failure path (C4/C5), media playback |
| 3. Physical device | you send; the user holds | recording during countdown (C3/C4), composite offset (C6), `reacted` (C7), sound (C9), face + voice (C10) |

The simulator has **no camera**: a reaction there always ends in "Recording
failed". Never mark C3, C6, C7, C9 or C10 as passed from a simulator run.

## Safety rules (non-negotiable)

- The app talks to the **production** backend. Use only the test accounts in
  `reference.md`. Never open a real person's gasp.
- Never type phone numbers, SMS codes or credentials. If an account is logged
  out, stop and ask the user to log in.
- Opening a gasp consumes it. Send a fresh gasp for every hold you test.
- Server evidence is read-only (`railway logs`). Never write to the database.

## Layer 1: gate (~2 min)

```bash
.claude/skills/gasp-core-e2e/scripts/gate.sh
```

Runs the contract flow test, then the same lint, typecheck and test scripts as CI.
Anything but `GATE OK` stops the run.

## Setup for layers 2–3

1. Metro: `preview_start {name: "gasp-metro-8083"}` (config in
   `/Users/gabrielgimenes/www/.claude/launch.json`). Clients must point at it;
   reconnect a stale client with the dev-client URL in `reference.md`.
2. Devices from `reference.md`: check with `xcrun simctl list devices booted`
   and `xcrun devicectl list devices`. Screenshot each one and confirm the
   right account is logged in (profile tab).
3. Test media: `.claude/skills/gasp-core-e2e/scripts/make-test-media.sh <dir>`
   builds `gasp-audio.mp4` (voice + on-screen clock "AUDIO x.xs") and
   `gasp-photo.jpg`. Add them to the sender simulator:
   `xcrun simctl addmedia <sender-udid> <dir>/gasp-audio.mp4 <dir>/gasp-photo.jpg`.

Drive the simulators with the iOS Simulator `control` tool. Always screenshot
before tapping; the coordinates in `reference.md` are hints, not truth.

## Layer 2: simulator ↔ simulator

Sender = Bi simulator, receiver = Iaco simulator.

1. **Send** the photo from the sender: Camera tab → gallery → photo → Send →
   select the receiver → "Send to 1 friend". Expect the "Gasp sent" toast.
2. **Receive**: the receiver gets the in-app toast and the gasp appears in its
   Gasps tab.
3. **C2 early release**: open the gasp, hold ~1.5s (`touch_path`, a few
   samples on the same point), release before the 3-2-1 ends. Expect: still
   blurred, no alert, the gasp is still in the list.
4. **C1 + C4/C5 full hold**: start a screen recording
   (`xcrun simctl io <udid> recordVideo --codec h264 <file>.mp4`, background),
   hold for countdown + gasp duration + 1s, release, stop the recording
   (`kill -INT`). Expect: the gasp revealed after 3s through the circle, the
   gasp leaves the list, and "Recording failed" (no camera). REC must **not**
   be shown at all in the simulator (no recording ever started).
   Prove it: extract frames every 0.1s (`swift scripts/frames.swift <file>.mp4
   <dir> 0.1`) and run `python3 scripts/find-rec.py <dir>`; it must report
   `0 of N frames show REC`. A flash lasts ~15ms, so screenshots miss it.
5. Repeat 1 + 4 with the **video** (fresh send). Extract frames:
   `swift scripts/frames.swift <file>.mp4 <frames-dir> 0.5` and
   `python3 scripts/contact-sheet.py <frames-dir> <sheet>.jpg`. Read the sheet:
   the on-screen clock must advance from 0.0s right after the reveal and play
   to the end.
6. Server evidence: `scripts/server-calls.sh 15` must show `open` once per
   full hold, nothing for the early release, and a `close-view` when the
   receiver leaves without reacting.

## Layer 3: physical device

Sender = Bi simulator, receiver = the iPhone in `reference.md` (dev build
connected to the same Metro).

1. Send `gasp-audio.mp4` to the device account (fresh gasp).
2. Ask the user to open it, hold until the video ends, look at the preview,
   and tap **Send reaction**. Ask them to note: did they hear the voice? at
   what time did REC appear? did the preview show their face and voice?
3. Read the dev trace: `preview_logs {search: "[gasp-flow]", lines: 60}`,
   pipe the lines into `python3 scripts/trace-report.py`. It checks C3, C4/C5,
   C6 and C7 from the real timings and prints the timeline.
4. Server evidence: `scripts/server-calls.sh 10` must show
   `open` → `uploads` → `reactions/composite` 200 → `reactions` 201 (inbox)
   with **no `close-view`** in between.
5. On the sender simulator, open the chat with the receiver: the reaction is
   the side-by-side composite and the gasp starts at the reveal moment.

## Report

Write one table, a row per contract rule, with PASS / FAIL / NOT VERIFIED and
the evidence (screenshot, contact sheet, trace line or server call). Then list
anything outside the contract you noticed, and record each item that is not
fixed in this run with the `backlog` skill (`docs/backlog.md`). A rule only passes with evidence
from the layer that can prove it. If something failed, say which commit or
change most likely caused it before proposing a fix, and add a case to
`app/(modals)/__tests__/view-gasp.flow.test.tsx` that reproduces it when the
failure is reproducible in JS.
