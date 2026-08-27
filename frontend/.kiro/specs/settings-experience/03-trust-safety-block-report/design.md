# Design — Trust, Safety, Block & Report

## Data model

Do not overload the bidirectional `friendships` row for an asymmetric block. Add a directional `user_blocks` table with `blocker_id`, `blocked_id`, timestamps, and a unique pair. Add `reports` with reporter, target type/id, category, optional note, status, and timestamps.

## Enforcement point

Create a reusable `assertUsersCanInteract(actorId, recipientId)` service. Apply it to friend requests, conversation creation/messages, and gasp sends. Filter list/search/recommendation queries for block relationships. Protect direct resource reads by the same policy where appropriate.

## UX

Use a confirmation sheet that explains what block stops. On the profile menu, replace the current “Coming soon” handlers with real flows. Keep report separate from block so the user can do either or both.

## Privacy

Do not expose who reported whom, blocked-user lists, or report content through ordinary user endpoints.
