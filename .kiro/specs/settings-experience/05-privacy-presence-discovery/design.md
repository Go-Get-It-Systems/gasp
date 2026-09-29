# Design — Privacy, Presence & Discovery

## Preference model

Extend the shared server-side preference model with:

```ts
showActivityStatus: boolean; // default true, visible only to accepted friends
appearInRecommendations: boolean; // default true
```

Keep user profile visibility private-to-social graph by design; do not introduce public accounts in this slice.

## Enforcement

- The presence gateway must not emit online/offline activity to viewers who are not permitted to see it.
- Friends list/profile transformers must omit or normalize online/last-seen data based on the viewer's and subject's reciprocal settings.
- Recommendation queries must exclude `appearInRecommendations === false` and blocks.
- Search must apply blocks regardless of the chosen discoverability rule.

## UI

Place two plain-language controls in Privacy & Safety:

- `Show activity status to friends`
- `Appear in friend suggestions`

Use supporting copy, not legalistic language. For example: “When off, you also won’t see when friends are active.”
