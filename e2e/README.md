# GASP — E2E Test Suite (Maestro)

Automated End-to-End tests for the two core GASP flows and three resilience edge cases.

---

## Quick Start

### 1. Install Maestro CLI

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# macOS (Homebrew)
brew tap mobile-dev-inc/tap && brew install maestro

# Verify
maestro --version   # requires >= 1.38.0
```

> Windows: Maestro runs on WSL2. Run all commands inside a WSL2 terminal with an Android Emulator connected via `adb`.

### 2. Build a Development Client

Maestro requires a **development build** — it does not work with Expo Go.

```bash
cd d:\gasp-main

# Generate native projects (first time only)
npx expo prebuild --platform android

# Build a debug APK locally
npx expo run:android --variant debug

# OR use EAS for a development build
npx eas build --profile development --platform android --local
```

### 3. Configure Environment Variables

```bash
cp e2e/config/.env.test.example e2e/config/.env.test
# Edit .env.test with your staging credentials
```

| Variable | Description |
|---|---|
| `GASP_PERSONAL_PHONE` | Phone number of the pre-registered personal user |
| `GASP_PERSONAL_OTP` | OTP code (Firebase Auth Emulator or staging) |
| `GASP_BUSINESS_PHONE` | Phone number of the pre-registered business user |
| `GASP_BUSINESS_OTP` | OTP code for business user |
| `GASP_FRIEND_NAME` | Display name of the personal user's friend |
| `GASP_FRIEND_USERNAME` | Username of the friend (for search filter test) |
| `GASP_WORKSPACE_HANDLE` | Business workspace handle (without @) |
| `GASP_CAMPAIGN_TITLE` | Title used when creating the test campaign |

### 4. Grant Device Permissions

Grant camera, microphone, and storage permissions before the test runs — otherwise the permission gates block the flows.

```bash
# Android (run once after install)
adb shell pm grant com.gasp.app android.permission.CAMERA
adb shell pm grant com.gasp.app android.permission.RECORD_AUDIO
adb shell pm grant com.gasp.app android.permission.READ_EXTERNAL_STORAGE
adb shell pm grant com.gasp.app android.permission.WRITE_EXTERNAL_STORAGE

# iOS Simulator
xcrun simctl privacy booted grant camera com.gasp.app
xcrun simctl privacy booted grant microphone com.gasp.app
xcrun simctl privacy booted grant photos com.gasp.app
```

### 5. Seed Test Media

Flow 2 (campaign creation) and edge cases require a short video in the device gallery.

```bash
# Android — push a test video to DCIM
adb push e2e/test-assets/campaign.mp4 /sdcard/DCIM/Camera/campaign.mp4
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d file:///sdcard/DCIM/Camera/campaign.mp4

# iOS Simulator
xcrun simctl addmedia booted e2e/test-assets/campaign.mp4
```

> Add a short (5–10s) H.264 MP4 at `e2e/test-assets/campaign.mp4`. Not committed — add to `.gitignore`.

---

## Running the Tests

### Run a single flow

```bash
# Flow 1: Auth + Camera + Send Gasp
maestro test e2e/flows/01_camera_capture_send.yaml \
  --env-file e2e/config/.env.test

# Flow 2: Business Campaign Cycle
maestro test e2e/flows/02_business_campaign_cycle.yaml \
  --env-file e2e/config/.env.test
```

### Run all flows

```bash
maestro test e2e/flows/ --env-file e2e/config/.env.test
```

### Run edge cases

```bash
# Edge case 1: Upload failure + retry
maestro test e2e/edge-cases/03_upload_failure_retry.yaml \
  --env-file e2e/config/.env.test

# Edge case 2: Socket.IO disconnect
maestro test e2e/edge-cases/04_socketio_disconnect.yaml \
  --env-file e2e/config/.env.test

# Edge case 3: Rate limit 429 + smart retry
maestro test e2e/edge-cases/05_rate_limit_retry.yaml \
  --env-file e2e/config/.env.test
```

### Run everything

```bash
maestro test e2e/ --env-file e2e/config/.env.test
```

### Interactive recording (Maestro Studio)

```bash
maestro studio
```

Opens a live inspector connected to the running app — useful for finding exact selector paths on new screens.

---

## Edge Case Setup Details

### Edge Case 1 — Upload Failure (`03_upload_failure_retry.yaml`)

Uses ADB to toggle airplane mode before tapping Send, then restores it before retry.

The scripts in `e2e/scripts/` are loaded by Maestro's `runScript` command:
- `network_off.js` — enables airplane mode
- `network_on.js` — disables airplane mode

**iOS alternative:** Use [mitmproxy](https://mitmproxy.org/) to intercept and reset Firebase Storage connections:
```bash
mitmproxy --mode transparent --scripts e2e/scripts/drop_firebase.py
```

### Edge Case 2 — Socket.IO Disconnect (`04_socketio_disconnect.yaml`)

Uses `iptables` to block port 3000 (backend only) without cutting Firebase connectivity. Requires a rooted emulator:

```bash
adb root
adb remount
```

Scripts: `block_ws_port.js` / `unblock_ws_port.js`

### Edge Case 3 — Rate Limit 429 (`05_rate_limit_retry.yaml`)

Requires [WireMock](https://wiremock.org/) running as a local proxy:

```bash
# Install WireMock standalone
curl -o wiremock.jar \
  https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/3.5.4/wiremock-standalone-3.5.4.jar

# Load the stub and start on port 3001
java -jar wiremock.jar --port 3001 --root-dir e2e/wiremock

# Point the app at the WireMock proxy
# In e2e/config/.env.test:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3001   (Android emulator)
# EXPO_PUBLIC_API_URL=http://localhost:3001   (iOS simulator)
```

The stub file `e2e/wiremock/gasps_batch_429_then_201.json` uses WireMock Scenarios to return 429 on the first call and 201 on the second — simulating a transient rate limit.

---

## CI Integration

### GitHub Actions example

```yaml
name: E2E Tests
on: [push]

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Setup Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          arch: x86_64

      - name: Install app
        run: adb install app-debug.apk

      - name: Grant permissions
        run: |
          adb shell pm grant com.gasp.app android.permission.CAMERA
          adb shell pm grant com.gasp.app android.permission.RECORD_AUDIO

      - name: Run E2E flows
        run: |
          maestro test e2e/flows/ \
            --env GASP_PERSONAL_PHONE=${{ secrets.GASP_PERSONAL_PHONE }} \
            --env GASP_PERSONAL_OTP=${{ secrets.GASP_PERSONAL_OTP }} \
            --env GASP_BUSINESS_PHONE=${{ secrets.GASP_BUSINESS_PHONE }} \
            --env GASP_BUSINESS_OTP=${{ secrets.GASP_BUSINESS_OTP }} \
            --env GASP_FRIEND_NAME=${{ secrets.GASP_FRIEND_NAME }} \
            --env GASP_FRIEND_USERNAME=${{ secrets.GASP_FRIEND_USERNAME }} \
            --env GASP_WORKSPACE_HANDLE=${{ secrets.GASP_WORKSPACE_HANDLE }} \
            --env GASP_CAMPAIGN_TITLE="Summer Drop 2026"
```

---

## Recommended Code Changes

The following changes to the app source would improve selector stability and eliminate coordinate-based taps:

| File | Change | Reason |
|---|---|---|
| `app/(tabs)/camera.tsx` | Add `testID="camera-shutter"` to the shutter `Pressable` | Replaces fragile `tapOn: point: "50%,85%"` |
| `app/(tabs)/camera.tsx` | Add `accessibilityLabel="Take photo"` to shutter button | WCAG 2.1 §1.1.1 non-text content |
| `app/(auth)/welcome.tsx` | Add `accessibilityLabel="Get started with phone"` to phone button | More resilient than text match |
| `app/(auth)/phone-login.tsx` | Add `testID="phone-input"` to the `PhoneInput` | Avoids relying on placeholder text |
| `app/(auth)/verify-code.tsx` | Add `testID="otp-input"` to `OtpInput` | Auto-submit works without placeholder tap |
| `app/(modals)/send-gasp.tsx` | Add `testID="send-button"` to the send `Pressable` | Avoids brittle text count matching |
| `app/(modals)/campaign-reaction-viewer.tsx` | Add `testID="hold-gesture-area"` to the `GestureDetector` View | Replaces coordinate-based long press |

These changes are non-breaking and add zero visual impact. They also satisfy Rule 7 of the project's accessibility guidelines.

---

## File Structure

```
e2e/
├── README.md                        ← This file
├── STRATEGY.md                      ← Tool choice + Gherkin + edge case analysis
├── config/
│   ├── .env.test.example            ← Template (commit this)
│   ├── .env.test                    ← Real credentials (gitignored)
│   └── maestro.config.yaml          ← Maestro global config
├── flows/
│   ├── 00_auth_personal.yaml        ← Subflow: personal user auth
│   ├── 00_auth_business.yaml        ← Subflow: business user auth
│   ├── 01_camera_capture_send.yaml  ← Flow 1: capture + send gasp
│   └── 02_business_campaign_cycle.yaml ← Flow 2: campaign → reaction → pin → metrics
├── edge-cases/
│   ├── 03_upload_failure_retry.yaml ← Upload failure + retry
│   ├── 04_socketio_disconnect.yaml  ← Socket.IO disconnect + reconnect
│   └── 05_rate_limit_retry.yaml     ← 429 rate limit + smart retry
├── scripts/
│   ├── network_off.js               ← ADB: enable airplane mode
│   ├── network_on.js                ← ADB: disable airplane mode
│   ├── block_ws_port.js             ← ADB iptables: block port 3000
│   └── unblock_ws_port.js           ← ADB iptables: unblock port 3000
├── wiremock/
│   └── gasps_batch_429_then_201.json ← WireMock scenario stub
└── test-assets/
    └── campaign.mp4                 ← Short test video (gitignored, seed manually)
```
