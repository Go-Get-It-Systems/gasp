# Implementation Plan: Chat Realtime Delivery

## Tasks

- [x] 1. Define participant-scoped message fan-out
  - [x] 1.1 Add a message-service helper that returns all conversation participant ids.
  - [x] 1.2 Emit new-message and conversation-update events to each personal room for Socket.IO, REST, and reaction-created messages.
  - [x] 1.3 Add backend coverage for unique sender/recipient fan-out and the REST message path.
  - _Requirements: 1.1-1.3, 4.1_

- [x] 2. Make the frontend recover from reconnects
  - [x] 2.1 Add a socket connect subscription helper with cleanup.
  - [x] 2.2 Rejoin an open conversation after reconnect.
  - [x] 2.3 Add reconnect cleanup tests.
  - _Requirements: 2.1-2.3, 5.2_

- [x] 3. Reconcile Chat unread UI immediately
  - [x] 3.1 Handle `message.new` notification events as an invalidate-and-hint fallback.
  - [x] 3.2 Render the Chat marker from query unread state or the temporary hint.
  - [x] 3.3 Clear the hint after authoritative cache reconciliation.
  - [x] 3.4 Add listener and tab-indicator tests.
  - _Requirements: 3.1-3.5, 4.1-4.3, 5.2_

- [ ] 4. Validate end to end
  - [x] 4.1 Run frontend test suite, typecheck, and focused lint.
  - [x] 4.2 Run backend tests, typecheck, and lint.
  - [ ] 4.3 Perform two-user simulator QA across inactive, active, and reconnected states.
  - _Requirements: 5.1-5.4_

## Dependency graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2", "3.3"] },
    { "id": 2, "tasks": ["1.3", "2.3", "3.4"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] }
  ]
}
```

## Validation results — 2026-08-06

| Check | Result |
|---|---|
| Frontend suite | Pass — 32 suites, 309 tests. |
| Frontend typecheck | Pass — `npx tsc --noEmit`. |
| Frontend focused lint | Pass with existing warnings only (console statements and BOM). |
| Backend suite | Pass — 12 files, 104 tests. |
| Backend typecheck | Pass — `npm run typecheck`. |
| Backend lint | Not runnable — repository has ESLint v9 but no `eslint.config.*`; this is a pre-existing tooling configuration gap. |
| Production deployment | Success — Railway deployment `b40edb25-d6d9-4314-ae88-b9ac07d4d6ed`; `/health` returned `status: ok`. |
| Two-user manual QA of the fix | Partially prepared — recipient account restored to Camera; second login and message exchange are blocked by the local Simulator approval limit. |
