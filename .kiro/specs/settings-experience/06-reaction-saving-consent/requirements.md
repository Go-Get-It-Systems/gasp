# Requirements — Reaction Saving Consent

## Goal

Give people control over whether another person may save a reaction that contains their face and voice.

## Product decision required

Before implementation, approve D3: **“Allow others to save my reactions” defaults to off.** This spec must not be implemented with an implicit opt-in.

## Requirements

1. The user shall set a default permission for future reactions: allow or disallow the original Gasp sender from saving the combined result.
2. The chosen permission shall be attached immutably to each reaction at creation time; later preference changes affect only future reactions.
3. When saving is not permitted, the app shall hide/disable save and export actions for unauthorized viewers and the backend shall reject direct requests.
4. The creator of original content retains access only as expressly allowed by the final rule; no third party receives save rights.
5. The reaction author shall see clear wording before or during reaction creation when a per-reaction override is offered.

## Out of scope

- Public sharing, reposting, downloads outside the app, DRM, and watermark redesign.

## Acceptance checklist

- [ ] Default-off users create reactions that cannot be saved by the original sender.
- [ ] An allowed reaction can be saved only by its authorized recipient.
- [ ] Changing preference later does not alter historical reaction permissions.
