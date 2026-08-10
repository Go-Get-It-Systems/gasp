# Design — Settings Foundation

## Navigation map

```text
Settings
├─ Account → Edit Profile / account summary
├─ Notifications → current permission + category placeholders
├─ Privacy & Safety → safety hub + privacy placeholders
├─ Storage & Data → existing download/cache controls
├─ Help → support, terms, privacy policy, report-a-problem entry
└─ About → app version, open-source/legal links where applicable
```

Use child modal routes under `app/(modals)/` or a nested settings route group. Choose one convention and use it consistently; do not place real content behind unhandled `TouchableOpacity` rows.

## Data boundaries

- Device media preferences remain in `useMediaCacheStore`.
- Current notification permission is read from `expo-notifications`; opening OS settings uses platform linking.
- No new database tables are required.

## Instrumentation

Track screen open and failed system-settings link events only; do not record settings values that reveal user safety choices.
