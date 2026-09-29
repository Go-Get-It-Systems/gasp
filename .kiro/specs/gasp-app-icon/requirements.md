# Requirements Document

## Introduction

This spec replaces the remaining Expo starter artwork used as Gasp's device
identity with the approved Gasp `G!` brand. The current `app.json` points the
top-level app icon, Android adaptive icon layers, Android monochrome icon,
Android notification icon, and splash artwork at default Expo/template assets.
As a result, installed builds can look like a generic Expo app rather than
Gasp on the home screen and other native surfaces.

This is a build-time branding feature. It changes image assets and Expo
configuration only; it does not change navigation, runtime UI, authentication,
notifications delivery, application identifiers, or store metadata.

---

## Glossary

- **App_Icon**: The installed application icon shown by iOS, Android, app
  settings, search, and store/build surfaces.
- **Approved_Gasp_Logo**: The blue/purple/pink gradient Gasp mark containing
  the white `G!`, supplied by product and already represented by
  `assets/images/gasp.png`.
- **iOS_Icon**: A square, full-bleed 1024×1024 PNG without transparent pixels
  or pre-rendered rounded corners; iOS applies the final mask.
- **Adaptive_Icon**: Android launcher artwork formed from separate foreground
  and background layers, then masked by the device launcher.
- **Monochrome_Icon**: The single-colour Android 13+ themed icon.
- **Notification_Icon**: The Android status-bar/tray icon, rendered from an
  all-white glyph on transparency.
- **Splash_Artwork**: The logo shown by `expo-splash-screen` while the native
  application starts.
- **Release_Build**: A locally compiled or EAS preview/production binary. App
  icon and splash changes are native build-time changes and are not delivered
  by an OTA JavaScript update.
- **Default_Expo_Artwork**: The blue Expo “A” and construction-grid placeholder
  currently stored in the configured icon files.

---

## Requirements

### Requirement 1: Replace default Expo branding

**User Story:** As a Gasp user, I want the installed app to display the Gasp
brand, so that I can recognise it immediately on my device.

#### Acceptance Criteria

1. THE project SHALL no longer display Default_Expo_Artwork on any configured
   mobile App_Icon, Adaptive_Icon, Monochrome_Icon, Notification_Icon, or
   Splash_Artwork surface.
2. THE replacement artwork SHALL use the Approved_Gasp_Logo and preserve the
   `G!` silhouette, proportions, white glyph, and blue/purple/pink visual
   identity.
3. THE feature SHALL NOT add a wordmark, “Made with Gasp” text, tagline, or
   unrelated decorative element.
4. THE feature SHALL NOT change `name`, `slug`, `bundleIdentifier`, Android
   package, EAS project ID, URL scheme, runtime version, or build numbers.

---

### Requirement 2: Provide a valid iOS and legacy app icon

**User Story:** As an iPhone user, I want a crisp Gasp icon without white
gutters or double-rounded corners, so that it looks native beside other apps.

#### Acceptance Criteria

1. THE iOS_Icon SHALL be a PNG exactly 1024×1024 pixels.
2. THE iOS_Icon SHALL be full-bleed and SHALL NOT contain transparent pixels.
3. THE iOS_Icon SHALL NOT include a white outer canvas, construction guides,
   or pre-rendered corner transparency.
4. THE `expo.icon` configuration SHALL resolve to the approved replacement
   asset.
5. THE Android legacy `android.icon` configuration SHALL resolve to the same
   complete Gasp App_Icon for launchers that do not use adaptive icons.
6. WHEN iOS applies rounded, dark, or system masks, THE `G!` SHALL remain
   centred, recognisable, and uncropped.

---

### Requirement 3: Provide Android adaptive and themed icons

**User Story:** As an Android user, I want the Gasp icon to work with my
launcher shape and themed icons, so that it remains recognisable across device
customisation.

#### Acceptance Criteria

1. THE Adaptive_Icon SHALL use a transparent foreground layer containing only
   the `G!` symbol and a separate Gasp-coloured background layer.
2. THE adaptive foreground and background images SHALL be PNG files with
   matching square dimensions.
3. THE `G!` foreground SHALL remain within the Android adaptive-icon safe zone
   so circle, squircle, rounded-square, and other launcher masks do not crop
   the glyph or exclamation mark.
4. THE Adaptive_Icon SHALL remain visually centred under supported launcher
   parallax/motion effects.
5. THE Monochrome_Icon SHALL contain a single-colour `G!` silhouette on a
   transparent background for Android 13+ themed icons.
6. THE adaptive foreground SHALL NOT contain the full coloured rounded-square
   badge; colour belongs to the background layer.

---

### Requirement 4: Provide a valid Android notification icon

**User Story:** As an Android user receiving a Gasp notification, I want the
status-bar icon to look like Gasp rather than Expo or an unreadable square.

#### Acceptance Criteria

1. THE Notification_Icon SHALL be a 96×96 PNG.
2. THE Notification_Icon SHALL contain an all-white `G!` glyph on a transparent
   background.
3. THE notification config plugin SHALL reference the dedicated notification
   asset rather than the full-colour App_Icon.
4. THE existing notification tint colour MAY remain `#7C3AED`.
5. THE Notification_Icon SHALL remain readable in the Android status bar and
   expanded notification tray.

---

### Requirement 5: Replace placeholder splash artwork

**User Story:** As a user opening Gasp, I want the launch artwork to match the
installed Gasp icon, so that no Expo template artwork appears during startup.

#### Acceptance Criteria

1. THE Splash_Artwork SHALL use a Gasp `G!` mark with transparency.
2. THE existing splash background colour SHALL remain `#0A0A0F`.
3. THE splash plugin SHALL continue to use `resizeMode: "contain"` and
   `imageWidth: 200`, unless device QA proves the logo is too small or large.
4. THE splash change SHALL be assessed in a Release_Build because Expo Go and
   development builds do not reliably represent the production splash.
5. THE feature SHALL NOT change splash timing, animation, or runtime loading
   behaviour.

---

### Requirement 6: Preserve unrelated surfaces

**User Story:** As a developer, I want this branding update to stay
asset/configuration-only, so that it cannot introduce runtime regressions.

#### Acceptance Criteria

1. THE feature SHALL NOT modify React components, application state, API
   contracts, notification delivery logic, or native permission copy.
2. THE web favicon SHALL remain unchanged in this feature unless explicitly
   approved as a follow-up.
3. THE existing `G!` reaction-video watermark assets SHALL remain unchanged.
4. THE feature SHALL require a new native build; documentation SHALL state
   that an OTA update is insufficient.
5. THE project SHALL continue to resolve all configured image paths through
   Expo config evaluation.

---

### Requirement 7: QA and regression coverage

**User Story:** As a release owner, I want objective icon checks and device
coverage, so that a broken or cached icon does not reach TestFlight or Play
testing.

#### Acceptance Criteria

1. AUTOMATED QA SHALL verify each configured asset exists, is a PNG, and has
   the required dimensions and alpha behaviour.
2. AUTOMATED QA SHALL verify Expo configuration resolves without schema or
   missing-file errors.
3. MANUAL QA SHALL use a clean install or uninstall/reinstall because device
   launchers may cache old app icons.
4. MANUAL QA SHALL verify iOS home screen, App Library/search, Settings storage
   listing where available, and notification badge placement.
5. MANUAL QA SHALL verify Android launcher circle, squircle/rounded-square,
   Android 13+ themed icon, app info, status-bar notification, and expanded
   notification tray.
6. MANUAL QA SHALL verify light and dark wallpapers do not make the `G!`
   illegible.
7. MANUAL QA SHALL verify the release splash contains no Expo “A” or template
   construction grid.
8. IF any old icon remains after a clean native build and reinstall, THE
   release SHALL be blocked until native asset caching/config generation is
   corrected.
