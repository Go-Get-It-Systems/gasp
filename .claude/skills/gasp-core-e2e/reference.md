# gasp-core-e2e reference

## Accounts and devices (production test accounts only)

| Role | Account | Where | Id |
|---|---|---|---|
| Sender | Bi (@bialencar) | iPhone 17 Pro simulator | `4BDF06B2-0F40-475C-8AA3-3D11B920FCF3` |
| Receiver (layer 2) | Iaco (@iacoalencar) | iPhone 17 Pro Max simulator | `6C6A1B9D-FDF2-4118-ACC8-2F93DC401B73` |
| Receiver (layer 3) | Iaco | iPhone 15 Pro (physical, cable) | devicectl `3E63BF13-94DF-599F-B2C9-842C1F7C1240` |

The user logs these accounts in; never type their numbers or codes.
The iPhone 15 Pro Max (`E0ACDCA2-...`) can't install dev builds until the Apple
Developer account holder accepts the latest Program License Agreement.

## App

- Bundle id `com.gasp.app`, scheme `gasp`.
- Reconnect a dev client to Metro on port 8083:
  `xcrun simctl openurl <udid> "exp+gasp://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8083"`.
  On the physical iPhone use the Mac's LAN IP instead of localhost
  (`ipconfig getifaddr en0`) and open it with
  `xcrun devicectl device process launch --device <id> --payload-url "<url>" com.gasp.app`.

## Coordinate hints (device points, iPhone 17 Pro 402×874)

Screenshot first; layouts change.

| Screen | Control | Point |
|---|---|---|
| Camera tab | gallery button | (56, 706) |
| Gallery picker | newest item | (66, 216) |
| Media preview | Send | (247, 789) |
| Send to | first friend row | (200, 394) |
| Send to | "Send to 1 friend" | (201, 796) |
| Tab bar | Discover / Camera / Gasps / Chat / Profile | y≈805; x≈40 / 120 / 200 / 280 / 360 |

## Holding in the simulator

`touch_path` with samples on one point; `dt_ms` ≤ 1000 per sample and ≤ 30s in
total. A 10s photo needs ~14s: 3s countdown + 10s + 1s slack.

## Dev trace format

`[gasp-flow] <step> at=<epoch ms> key=value ...` from `services/flowTrace.ts`,
printed only in dev builds. Steps: hold-start, camera-ready,
recording-started, recording-failed, reveal, server-open, release, preview,
no-clip, upload-done, upload-failed, composite, reaction-delivered,
reaction-failed, close-view.
