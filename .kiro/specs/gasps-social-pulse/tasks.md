# Implementation Plan: Gasps Social Pulse

## Overview

Deliver a private, attention-first Gasps experience for personal friend-to-
friend Moments. Build the durable Moment and received-reaction contracts before
the UI, then recompose the existing Gasps tab from those server-authoritative
sources. Do not include Business Studio, Circles, prompts, widgets, or public
social features.

## Tasks

- [ ] 1. Establish the personal Moment data contract
  - [ ] 1.1 Add a migration for `gasp_moments` and `gasps.moment_id`
    - Create the parent table with shared media, sender, replay, timestamps,
      and indexes for sender/latest queries.
    - Add nullable `moment_id` to `gasps` with an indexed sender/moment path.
    - Do not backfill or heuristically group existing rows.
    - _Requirements: 1.1, 1.5, 3.1, 3.2, 3.6, 6.6_

  - [ ] 1.2 Link persisted reactions to their chat continuation
    - Add nullable `message_id` to `reactions` with an appropriate FK/index.
    - Update reaction creation so the created reaction is associated with the
      persisted reaction message after that message is successfully created.
    - Preserve existing chat/socket/push behavior when message creation fails.
    - _Requirements: 4.2, 4.5, 6.4_

  - [ ] 1.3 Add backend schemas, transformers, and focused migration tests
    - Keep request/response contracts explicit and validated.
    - Test legacy Gasp rows without `moment_id` and reaction rows without
      `message_id` as valid backward-compatible states.
    - _Requirements: 3.6, 4.2, 6.2, 6.6_

- [ ] 2. Create personal Moment and Reaction_Return APIs
  - [ ] 2.1 Make personal batch send create a Moment atomically
    - Validate all recipients before writes and retain existing safety checks.
    - Write a Moment and all recipient Gasp rows in one transaction.
    - Emit recipient events only after a successful commit.
    - Return the existing `Gasp[]` array unchanged — do NOT add a Moment field
      to the response; `useSendBatchGasp` depends on this exact shape. The
      frontend fetches the Moment separately via `invalidateQueries` on
      `gasps.latestMoment` inside `onSuccess`.
    - _Requirements: 1.1, 1.5, 1.6, 3.1, 3.2, 3.7_

  - [ ] 2.2 Add `GET /gasps/moments/latest`
    - Return `null` for no personal Moment.
    - Aggregate recipient, delivered/opened, reaction, and expiry counts from
      linked personal Gasp rows only.
    - Include only compact, permission-safe identity summaries.
    - Exclude Business_Gasps (`campaignId IS NOT NULL`) and blocked relationships.
    - _Requirements: 1.1, 1.5, 3.3, 3.4, 3.5_

  - [ ] 2.2b Extend `GET /gasps/pending` to exclude Business_Gasps
    - Add `campaignId IS NULL` filter to the pending-Gasps query so the
      Open-now rail never surfaces business content.
    - This is an explicit change to an existing endpoint; regression tests must
      confirm personal Gasps are unaffected and legacy rows without `campaignId`
      remain valid.
    - _Requirements: 1.1, 1.5_

  - [ ] 2.3 Add cursor-paginated `GET /reactions/received`
    - Join reaction, original personal Gasp, reactor, and reliable message /
      conversation continuation context.
    - Enforce sender ownership and block/access rules.
    - Exclude Business_Gasps and return newest first.
    - Establish server-generated `snapshotAt` from database time before the
      first-page read and include it in the opaque cursor alongside
      `(capturedAt, id)`; every page must apply
      `reactions.created_at <= snapshotAt` before the cursor predicate.
    - _Requirements: 1.1, 1.5, 4.1, 4.2, 4.7_

  - [ ] 2.4 Cover backend contracts and failure cases
    - Test atomic batch success and no partial recipient writes on failure.
    - Test latest-Moment totals, legacy exclusion, campaign exclusion, blocks,
      pagination, unauthorized access, and linked reaction-message behavior.
    - _Requirements: 3.7, 4.1 through 4.2, 4.7, 6.6_

- [ ] 3. Add frontend contracts, queries, and realtime cache updates
  - [ ] 3.1 Add Zod schemas and API clients
    - Define `Moment`, `LatestMoment`, and `ReactionReturn` schemas.
    - Add validated API functions and centralized query keys.
    - Derive all domain types from schemas.
    - _Requirements: 3.3, 4.2, 6.1, 6.2_

  - [ ] 3.2 Add React Query hooks
    - Add `useLatestMoment` and `useReceivedReactions` with clear enabled,
      loading, empty, error, and refetch semantics.
    - Do not add server loading/data functions to Zustand.
    - _Requirements: 4.1, 4.3, 6.1_

  - [ ] 3.3 Extend the global socket listener contract
    - Update/invalidate received-reactions and latest-Moment queries when a
      sender receives `gasp:reaction_received`.
    - Preserve current pending-Gasp, chat, notification, reconnect, and
      cleanup behavior.
    - Add focused listener tests for duplicate/idempotent updates.
    - _Requirements: 4.6, 6.4, 6.6_

- [ ] 4. Build the attention-first Gasps interface
  - [ ] 4.1 Create the Pulse header and Open-now rail
    - Replace ambiguous Feed/hold wording with localized Gasps/attention copy.
    - Build privacy-safe loading, populated, and empty states.
    - Reuse `CountdownRing`, avatar fallback, media cache, and typed viewer
      navigation without revealing media.
    - Add accessible camera and item actions with safe item-scoped preloading.
    - _Requirements: 1.4, 2.1 through 2.5, 5.1 through 5.5_

  - [ ] 4.2 Create LatestMomentCard
    - Render one compact latest personal Moment with pluralized human outcome
      copy and privacy-safe visual treatment.
    - Do not add an interaction until a useful detail destination is designed.
    - Handle legacy/no-data/loading/error states without a blank card.
    - _Requirements: 3.3 through 3.6, 5.1 through 5.3_

  - [ ] 4.3 Create the Reaction_Return section and `openReactionContinuation` helper
    - Render server-backed received reactions above secondary activity.
    - Create `openReactionContinuation({ reactionId, conversationId,
      messageId, gaspId, reactionVideoUri, originalImageUri, senderName,
      originalMediaType })` in `services/navigation.ts`. With a
      `conversationId`, navigate to `/chat/{conversationId}` and include
      `highlightMessageId` only when `messageId` is present. Without a
      conversation, only call `openReactionResult` if its complete required
      media contract is present; otherwise capture a centralized Sentry warning
      with `reactionId` and `gaspId`, then abort. Mirror the existing
      `notificationRouting.ts` pattern for `gasp.reaction_received`.
    - Remove `gaspStore.reactions` as the source for this tab section.
    - _Requirements: 4.3 through 4.6, 5.1 through 5.5, 6.3_

  - [ ] 4.4 Recompose `app/(tabs)/inbox.tsx`
    - Keep it as a thin coordinator using one vertical virtualized list or a
      safe equivalent; avoid uncontrolled nested scrolling.
    - Order sections: Open now, Your latest moment, Reactions for you, then
      secondary requests/activity.
    - Preserve refresh behavior, existing friend-request actions, tab unread
      state, and bottom safe-area behavior.
    - _Requirements: 1.1 through 1.4, 2.1 through 2.6, 4.4, 5.3_

- [ ] 5. Localize, test, and validate the feature
  - [ ] 5.0 Set up property-based testing infrastructure
    - Install and configure a PBT library compatible with the existing Jest
      setup (e.g., `fast-check`); add a shared test helper for generating
      `Gasp`, `LatestMoment`, and `ReactionReturn` arbitraries.
    - Create the 14 property-based test files tagged with
      `Feature: gasps-social-pulse, Property N: <title>`, each running a
      minimum of 100 iterations.
    - Map each test to the property defined in design.md: P1 business
      exclusion, P2 access control, P3 media privacy, P4 open-now ordering,
      P5 section priority order, P6 batch atomicity, P7 Moment completeness,
      P8 card uniqueness, P9 pagination non-overlap, P10 ReactionReturn schema,
      P11 socket cache invalidation, P12 validateResponse Sentry capture,
      P13 no screen-level listener leak, P14 navigation no-duplicate and its
      chat/result/abort fallback cases.
    - _Requirements: 6.6_
  - [ ] 5.1 Add localized copy and component tests
    - Add all new strings to existing locale files.
    - Test long names, plural summaries, privacy-safe previews, empty states,
      section order, card/item press behavior, and accessibility labels.
    - _Requirements: 2.1 through 2.6, 3.4, 5.2 through 5.5, 6.6_

  - [ ] 5.2 Run automated verification
    - Run focused frontend and backend tests first, then repository typechecks
      and wider suites where baseline allows.
    - Record unrelated pre-existing lint failures separately.
    - _Requirements: 6.6_

  - [ ] 5.3 Run manual mobile QA with two personal accounts
    - Verify incoming image/video, expired/replayable paths, send to multiple
      friends, recipient opens, recipient reacts, sender sees durable return,
      background/reconnect update, friend request de-prioritization, privacy,
      long names, and empty state.
    - Verify a Business Studio account/campaign cannot create a Business
      section or reaction in personal Social_Pulse.
    - _Requirements: 1.1 through 1.6, 2.1 through 2.6, 3.1 through 3.7,
      4.1 through 4.7, 5.1 through 5.5, 6.7_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.2b", "2.3"] },
    { "id": 2, "tasks": ["2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["5.0", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3"] }
  ]
}
```

## Deferred follow-up gates

Do not start Circles, Pulse prompts, weekly recap, or widgets until this MVP
shows healthy open-before-expiry, reaction, and repeat-send behavior. Any
follow-up must define its own privacy model, frequency controls, data-retention
policy, and feature-specific validation before implementation.
