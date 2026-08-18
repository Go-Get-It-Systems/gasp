# Implementation Plan: Business Broadcast MVP

## 0. Scope alignment

- [ ] 0.1 Replace the former reaction-gallery/selection product scope with this
  Business Broadcast scope; record Featured Reactions and Creator Pro as future
  specs.
- [ ] 0.2 Confirm demo workspace, owner, follower cap of 20, one campaign/day
  and current 24-hour expiry/replay behaviour.
- [ ] 0.3 Record controlled-pilot acceptance of current public Firebase Storage
  URLs, or make signed URLs a release prerequisite.

## 1. Backend foundation

- [ ] 1.1 Add validated safe-off config: flag, allow-list, cap, daily limit and
  chunk size. _Requirements: R6_
- [ ] 1.2 Add additive workspace/follower/campaign/delivery schema and nullable
  `gasps.campaign_id`; do not add selection schema for this MVP. _R2-R4_
- [ ] 1.3 Add controlled demo seed/admin procedure and rollback/deactivation
  instructions. _R2, R6_
- [ ] 1.4 Implement owner/allow-list guards and consumer-safe business
  transformers. _R1, R2, R6_

## 2. Audience and public profile

- [ ] 2.1 Implement `GET /businesses/mine`, public profile by handle and
  idempotent follow/unfollow with block/cap enforcement. _R1, R2_
- [ ] 2.2 Add a small business card/profile entry to Discover without changing
  personal user schemas or adding ranking. _R2_

## 3. Campaign broadcast

- [ ] 3.1 Add owner-validated `campaigns/{workspaceId}/...` uploads. _R3, R6_
- [ ] 3.2 Implement draft CRUD, confirmation publish and authoritative state
  transitions including close/failure. _R3_
- [ ] 3.3 Extract/reuse the internal Gasp creation helper. _R4_
- [ ] 3.4 Add idempotent BullMQ fan-out and aggregate reconciliation; recheck
  eligibility before each delivery. _R4_
- [ ] 3.5 Disable campaign reaction capture/routing in the consumer viewer and
  prevent business conversations. _R4_
- [ ] 3.6 Implement aggregate overview/detail queries: queued, delivered,
  failed, opened and viewed only. _R5_

## 4. Mobile Studio and consumer flow

- [ ] 4.1 Add business Zod contracts, API service, scoped query keys and cache
  invalidation. _R1-R5_
- [ ] 4.2 Add owner-only Profile entry and separate `(business)` layout with
  Overview, Campaigns and Workspace. _R1_
- [ ] 4.3 Build campaign composer, preview, explicit publication confirmation
  and bounded publish-state polling. _R3_
- [ ] 4.4 Add authenticated public business profile and consumer Follow UI. _R2_
- [ ] 4.5 Make campaign Gasps visually normal in the consumer viewer while
  suppressing the business reaction CTA. _R4_

## 5. Verification and rollout

- [ ] 5.1 Add tests for membership, follow/block, limits, lifecycle, delivery
  idempotency, aggregate privacy and reaction suppression. _R1-R6_
- [ ] 5.2 Run mobile regression tests for navigation, cache isolation, composer
  validation and ordinary personal Gasp/reaction flows. _R1-R5_
- [ ] 5.3 Device QA with one owner and two followers: follow, publish,
  background push, hold/view, unfollow-before-publish, block, exit and flag
  rollback. _R2-R6_
- [ ] 5.4 Run the queue at cap 20; record throughput, retries, terminal counts
  and zero duplicates before enabling the pilot. _R4, R6_

## Definition of done

One administrator-provisioned demo owner can enter a separate Studio, publish
one daily campaign to a capped opt-in audience, and see only aggregate delivery
and viewing outcomes. Followers use their unchanged personal GASP viewer; no
business reaction, business chat, public UGC or reel capability is exposed.
