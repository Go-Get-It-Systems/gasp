# Design — Reaction Saving Consent

## Data model

Add an immutable `savePermission`/`isSaveAllowed` field to the reaction record. Store the final authorization at creation, not by checking the current profile preference when someone later tries to save.

Add `allowOthersToSaveMyReactions` to server-side user preferences with default set only after D3 approval.

## Enforcement

Use an authorization service that validates the requesting user is the person permitted by the reaction relationship. The client button is only a convenience; export/download endpoints and signed URLs must enforce the same rule.

## UX

Show the default in Privacy & Safety and, if product approves it, a lightweight override before sending a reaction. Avoid confusing wording such as “public”; state exactly who may save it.
