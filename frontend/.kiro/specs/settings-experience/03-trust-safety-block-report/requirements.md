# Requirements — Trust, Safety, Block & Report

## Goal

Give users a real, private way to stop contact from another user and flag harmful behavior.

## Requirements

### R1 — Blocking

1. A user shall be able to block another user from that user's profile and from relevant conversation entry points.
2. Blocking shall prevent new friend requests, new direct messages, and new gasps in both directions.
3. A blocked user shall not appear in search recommendations or discover suggestions for the blocker.
4. Existing content must follow a deliberate policy: hide it from normal surfaces immediately; retention/deletion remains governed by the data-lifecycle spec.
5. The blocker shall manage and unblock users from Settings.
6. The blocked user shall not receive a notification identifying who blocked them.

### R2 — Reporting

1. A user shall be able to report a profile, message, or gasp with a category and optional description.
2. A report shall capture the reporter, target, target type/id, reason, timestamp, and review status.
3. Report submission shall confirm receipt without promising an outcome or exposing reporter identity.
4. Duplicate accidental submissions shall be prevented.

### R3 — Safety and authorization

1. Users shall only block/unblock or report as themselves.
2. Client-side filtering shall not be the only enforcement; backend reads and writes must enforce block rules.
3. Safety actions and enforcement failures shall be audited securely without retaining unnecessary media copies.

## Out of scope

- Moderator console, automated abuse detection, and appeal workflow.

## Acceptance checklist

- [ ] Blocking immediately prevents all supported contact paths in both directions.
- [ ] Unblocking restores only future interaction; it does not recreate friendship.
- [ ] A report is stored securely and cannot be read by the reported user.
