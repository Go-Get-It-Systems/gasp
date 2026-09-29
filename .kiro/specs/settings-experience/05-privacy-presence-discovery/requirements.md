# Requirements — Privacy, Presence & Discovery

## Goal

Let users control whether friends see their activity and how new people can find them, while preserving the intentional friends-first model.

## Requirements

### R1 — Activity status

1. A user shall control whether accepted friends can see their online/activity status.
2. The default shall be **on for friends only** unless the product owner approves a different default.
3. When disabled, the user shall not receive other users' activity status either; this reciprocal rule avoids a one-sided privacy advantage.
4. The setting shall apply to online indicators, `lastSeenAt` exposure, bulk presence events, and server responses.

### R2 — Discoverability

1. A user shall control whether they can appear in recommendations/People You May Know.
2. Username search shall remain available to authenticated users by default because it is the deliberate friend-connection mechanism; any stricter search rule requires a separate product decision.
3. Block rules must override discoverability settings.

### R3 — Clarity

1. The Privacy screen shall explain exactly who can see each signal.
2. Changes shall persist server-side and take effect on another device after refresh.
3. The UI shall not claim that device location is collected or shared; GASP does not currently have a location feature.

## Acceptance checklist

- [ ] Disabling activity hides A from B and B from A.
- [ ] Disabling recommendations removes A from suggestion feeds but not necessarily direct username search.
- [ ] Block relationships always override the above behavior.
