# Implementation Plan: Gasp App Icon Replacement

## Overview

Replace every configured Expo/template device-branding asset with the approved
Gasp `G!` artwork. Keep the work asset/configuration-only and validate the
native build contract before device QA.

## Status

Implementation, Expo prebuild, automated source/native-resource QA, and iOS
Release launcher/splash/badge/Search QA are complete. iOS App Library and
Settings listing plus Android release QA remain pending.

## Tasks

- [x] 1. Audit current device-branding configuration
  - [x] 1.1 Inspect `app.json`
    - Confirm top-level icon points at `assets/images/icon.png`
    - Confirm Android adaptive layers still point at Expo starter assets
    - Confirm notification plugin incorrectly points at the full app icon
    - Confirm splash plugin still points at template artwork
    - _Requirements: 1.1, 4.3, 5.1_

  - [x] 1.2 Inspect current assets
    - Confirm the blue Expo “A” is present in launcher assets
    - Confirm the approved Gasp source exists
    - Record current dimensions and alpha state
    - _Requirements: 1.1, 1.2, 7.1_

- [x] 2. Produce the Gasp asset family
  - [x] 2.1 Replace `assets/images/icon.png`
    - Export 1024×1024 PNG
    - Use full-bleed gradient and centred white `G!`
    - Remove transparency, white outer margins, and pre-rounded corners
    - _Requirements: 1.2, 2.1, 2.2, 2.3_

  - [x] 2.2 Replace Android adaptive icon layers
    - Export matching 1024×1024 foreground/background PNGs
    - Keep foreground transparent and within the adaptive safe zone
    - Keep background full-bleed
    - Export monochrome `G!` with transparency
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 2.3 Add Android notification icon
    - Export `assets/images/notification-icon.png`
    - Use 96×96 all-white `G!` on transparency
    - _Requirements: 4.1, 4.2_

  - [x] 2.4 Replace splash placeholder artwork
    - Export 1024×1024 transparent Gasp mark
    - Preserve comfortable padding for `imageWidth: 200`
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Update Expo configuration
  - [x] 3.1 Add explicit legacy Android icon
    - Set `android.icon` to `./assets/images/icon.png`
    - _Requirements: 2.5_

  - [x] 3.2 Update notification plugin
    - Point to `./assets/images/notification-icon.png`
    - Preserve the existing tint colour unless QA rejects it
    - _Requirements: 4.3, 4.4_

  - [x] 3.3 Preserve unrelated configuration
    - Keep identifiers, permissions, plugins, build numbers, and favicon
      unchanged
    - _Requirements: 1.4, 6.1, 6.2_

- [x] 4. Add automated QA
  - [x] 4.1 Add an icon-asset validation script/test
    - Validate configured files exist
    - Validate PNG dimensions
    - Validate required alpha/no-alpha contracts
    - Validate notification icon is 96×96
    - _Requirements: 7.1, 7.2_

  - [x] 4.2 Validate Expo configuration
    - Run Expo config evaluation
    - Run TypeScript checking
    - Run the app test suite
    - _Requirements: 6.5, 7.2_

  - [x] 4.3 Validate generated native resources
    - Run a clean Expo prebuild for iOS and Android
    - Validate generated iOS asset-catalog images
    - Validate every Android density for launcher, adaptive, monochrome,
      notification, and splash resources
    - Validate generated Android manifest/XML resource references
    - Compile the iOS asset catalog with Xcode `actool`
    - _Requirements: 2.6, 3.2, 3.5, 4.3, 5.3, 6.5, 7.2_

- [ ] 5. Manual release-build QA
  - [ ] 5.1 iOS clean-install QA
    - [x] Build a local Release binary
    - [x] Uninstall the previous simulator build, then install the Release build
    - [x] Verify the Home screen icon and confirm no Expo artwork remains
    - [x] Verify notification badge placement
    - [x] Verify Spotlight Search
    - [ ] Verify App Library and Settings storage listing
    - _Requirements: 7.3, 7.4, 7.6, 7.8_

  - [ ] 5.2 Android adaptive-icon QA
    - Verify circle and squircle/rounded-square masks
    - Verify Android 13+ themed icon
    - Verify app-info icon
    - _Requirements: 3.3, 3.4, 3.5, 7.5, 7.6_

  - [ ] 5.3 Android notification QA
    - Trigger a notification on a physical device or release emulator
    - Verify status-bar and expanded-tray glyph
    - _Requirements: 4.5, 7.5_

  - [x] 5.4 Release splash QA
    - [x] Verify Gasp artwork on the existing dark background
    - [x] Confirm no Expo “A” or construction grid
    - [x] Use a Release build rather than Expo Go/dev-client rendering
    - _Requirements: 5.4, 7.7_

- [ ] 6. Finalise
  - [ ] 6.1 Record screenshots and QA results in this task file
    - [x] Record iOS Release Home screen and splash evidence
    - [ ] Record remaining iOS and Android release QA evidence
  - [ ] 6.2 Confirm native rebuild requirement in PR/release notes
  - [ ] 6.3 Confirm all automated and manual acceptance criteria pass

## Automated QA results — 2026-07-24

| Check | Result | Notes |
|---|---|---|
| `npm run validate:icons` | Pass | All configured PNG paths, dimensions, alpha contracts, pure-white glyphs, and Android adaptive safe-zone bounds pass. |
| `npx expo config --type public` | Pass | Expo SDK 54 resolves the app, adaptive, monochrome, notification, and splash asset paths. |
| `npx expo prebuild --no-install --platform all --clean` | Pass | Expo generated both native projects. Local non-secret placeholder Firebase files were used because credentials are intentionally absent from the isolated worktree; they were not committed. |
| `npm run validate:native-icons` | Pass | Generated iOS app/splash assets and all five Android density buckets pass. Android manifest and adaptive/themed/notification references pass. |
| Xcode `actool` | Pass | The iOS asset catalog compiled to `Assets.car` and generated 120×120 and 152×152 launcher icons without catalog errors. |
| `npm test -- --runInBand` | Pass | 26 suites and 288 tests pass. |
| Native output visual review | Pass | Xcode's generated 120px icon, Android's generated 192px legacy icon, adaptive composite, and platform splash resources remain clear and branded. |
| Android Gradle resource compilation | Environment unavailable | The machine has no Java runtime or Android SDK. Generated Android resources were instead checked directly across every density and native XML reference; release-build/device QA remains required. |
| `npx tsc --noEmit` | Existing baseline failure | Eight `global`-name errors remain in two unchanged test files. No TypeScript source changed in this feature. |
| `npm run lint` | Existing baseline failure | The repository reports 22 errors and 53 warnings in unchanged files. No reported issue is in this feature's files. |

## iOS Release QA results — 2026-07-24

| Check | Result | Notes |
|---|---|---|
| Local Release simulator build | Pass | Xcode Release build completed successfully for an iPhone 17 Pro Max simulator. Sentry source-map upload was disabled only for this local build because no auth token was available; project configuration was not changed. |
| Clean install and Home screen icon | Pass | The Release app was installed on a newly created simulator with no previous GASP installation. The `G!` remains clear, centred, full-bleed, and free of Expo/template artwork. [Evidence](qa/ios-release-home.png). |
| Release splash | Pass | A cold Release launch shows the white `G!` on the existing dark background with no Expo “A” or construction grid. [Evidence](qa/ios-release-splash.png). |
| Simulator cache diagnosis | Confirmed | A previously used simulator restored an old build-1 icon after its SpringBoard cache refreshed even though the Release bundle contained the new `G!`. A brand-new simulator installed the same binary with the correct icon, and a local-only build-number bump cleared the original simulator cache. This confirms a simulator cache issue rather than an asset/build defect. |
| iOS notification badge | Pass | A simulated local APNs payload applied a one-count badge. Its position does not obscure recognition of the `G!`. [Evidence](qa/ios-release-badge.png). |
| iOS Spotlight Search | Pass | Searching for `gasp` returns the installed app as the Top Hit with a crisp, recognisable `G!` at the smaller system-search size. [Evidence](qa/ios-release-search.png). |
| Physical iPhone | Not run | The connected iPhone was intentionally left untouched; current evidence is simulator-only. |

### Release QA still required

- Verify the icon in iOS App Library and the Settings storage listing.
- Build and clean-install Android, then capture adaptive masks, themed icon,
  app-info icon, notification glyph, and splash.
- These native assets cannot be delivered through an OTA JavaScript update;
  preview/production binaries must be rebuilt before release.

## Definition of done

The feature is complete when the approved Gasp mark appears across iOS and
Android launcher surfaces, Android themed and notification surfaces, and the
release splash; no Expo/template artwork remains; automated asset/config
validation passes; and manual clean-install QA is recorded.
