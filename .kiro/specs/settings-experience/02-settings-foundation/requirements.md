# Requirements — Settings Foundation

## Goal

Make Settings a truthful navigation hub: each visible setting either opens a useful screen or is intentionally unavailable with an explanation.

## Requirements

### R1 — Functional information architecture

1. Settings shall group rows as Account, Privacy & Safety, Notifications, Storage & Data, Help, and About.
2. Account Settings shall lead to profile management.
3. Notifications, Privacy & Safety, Help, and About shall each open a dedicated screen; they may show implemented controls and clearly labelled upcoming controls, but must not be inert rows.
4. Existing Photos, Videos, Cached Data, Clear Cache, and Log Out behavior shall be preserved.

### R2 — Contextual status

1. Rows shall display a concise current-state summary when known, such as `Wi‑Fi only`, `Enabled`, or `Not configured`.
2. A system permission that is disabled shall explain whether it can be changed in the app or needs the device Settings app.
3. Settings screens shall use accessible labels and preserve back navigation.

### R3 — Scope boundaries

1. This slice creates the navigation and screen shells; it shall not silently add privacy or notification persistence before their respective specs.
2. Future controls shall not be shown as active toggles until backed by a product rule and server state.

## Acceptance checklist

- [ ] Every visible Settings row has a working result.
- [ ] Existing media/cache settings still work after the refactor.
- [ ] Profile management is reachable from Settings and Profile.
- [ ] No screen claims a control is enabled when no backend behavior exists.
