# Design — Account Data Lifecycle

## Current foundation

The user table already includes `isActive`; device rows cascade from user deletion; authentication has token blacklisting. These are building blocks, not a completed lifecycle design.

## Proposed architecture

- `data_export_requests`: requester, state, object location, expiry, requested categories, timestamps.
- `account_deletion_requests`: requester, requested/cancelled/execute-after timestamps, confirmed identity metadata.
- Background jobs build encrypted/time-limited exports and execute deletion/anonymization after the grace period.
- A centralized `assertActiveAccount` guard prevents deactivated/deletion-pending accounts from authenticating into normal app activity.

## Export scope

Define exact categories before building: profile, friends, account preferences, messages the user is allowed to retain, Gasp/reaction metadata, and device/session history. Media expiration and other users' content rights must be documented rather than guessed.

## UX

Place this under `Account → Your information`. Use separate screens for export, deactivate, and delete; never place deletion beside ordinary profile edits.
