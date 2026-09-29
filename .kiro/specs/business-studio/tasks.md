# Implementation Plan: Business Broadcast MVP

## 0. Scope alignment

- [x] 0.1 Replace the former reaction-gallery/selection product scope with this
  Business Broadcast scope; record Featured Reactions and Creator Pro as future
  specs.
- [x] 0.2 Confirm demo workspace, owner, follower cap of 20, one campaign/day
  and current 24-hour expiry/replay behaviour.
- [x] 0.3 Record controlled-pilot acceptance of current public Firebase Storage
  URLs, or make signed URLs a release prerequisite.
  - **Decision recorded:** Public Firebase Storage URLs are accepted for the
    Business Broadcast MVP controlled pilot (max 20 followers, one
    administrator-provisioned demo business).
  - **Future prerequisite:** Firebase signed-URL hardening is a
    platform-security prerequisite before any broad or private brand rollout
    beyond this controlled pilot; see "Explicitly Deferred" in
    requirements.md.

## 1. Backend foundation

- [x] 1.1 Add validated safe-off config: flag, allow-list, cap, daily limit and
  chunk size. _Requirements: R6_
  - All defaults must leave the feature disabled (`BUSINESS_STUDIO_ENABLED=false`)
  - Config validation must accept `BUSINESS_STUDIO_FOLLOWER_CAP=0` as a valid value (zero prevents delivery without disabling the feature — R6.2)
  - `BUSINESS_STUDIO_ENABLED=false` must deny publishing operations; Studio entry for allow-listed owners is implementation-discretion and must not be mandated off by the flag alone (R6.3)
- [x] 1.2 Add additive workspace/follower/campaign/delivery schema and nullable
  `gasps.campaign_id`; do not add selection schema for this MVP. _R2-R4_
  - `business_followers` must store `explicit` (default `false`), `idempotent` (default `true`) and `independent` (default `true`) as concrete columns set at insert time; these values must never be derived on the fly (R2.5)
  - Defaults apply to all rows, including rows inserted before any explicit follow/unfollow action has occurred
- [x] 1.3 Add controlled demo seed/admin procedure and rollback/deactivation
  instructions. _R2, R6_
- [x] 1.4 Implement owner/allow-list guards and consumer-safe business
  transformers. _R1, R2, R6_
  - The publish endpoint guard must deny all publishing when `BUSINESS_STUDIO_ENABLED=false`
  - Studio entry guard for allow-listed owners is a separate, discretionary check; the flag alone must not hard-block Studio access for owners present in `BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS` (R6.3)

## 2. Audience and public profile

- [x] 2.1 Implement `GET /businesses/mine`, public profile by handle and
  idempotent follow/unfollow with block/cap enforcement. _R1, R2_
  - Block enforcement must be atomic: a single DB transaction must simultaneously override discovery visibility, the follow record and any pending delivery eligibility; partial states (e.g. delivery suppressed but follow record left intact) are not permitted (R2.6)
- [-] 2.2 Add a small business card/profile entry to Discover without changing
  personal user schemas or adding ranking. _R2_

## 3. Campaign broadcast

- [ ] 3.1 Add owner-validated `campaigns/{workspaceId}/...` uploads. _R3, R6_
- [ ] 3.2 Implement draft CRUD, confirmation publish and authoritative state
  transitions including close/failure. _R3_
- [ ] 3.3 Extract/reuse the internal Gasp creation helper. _R4_
- [ ] 3.4 Add idempotent BullMQ fan-out and aggregate reconciliation; recheck
  eligibility before each delivery. _R4_
  - The `/gasps/batch` restriction applies only to campaign fan-out: the BullMQ worker must be the exclusive mechanism for creating campaign Gasps; the mobile client must not call `/gasps/batch` for this purpose
  - Unrelated client use of `/gasps/batch` for personal Gasp flows is explicitly not restricted (R4.1)
- [ ] 3.5 Disable campaign reaction capture/routing in the consumer viewer and
  prevent business conversations. _R4_
- [ ] 3.6 Implement aggregate overview/detail queries: queued, delivered,
  failed, opened and viewed only. _R5_

## 4. Mobile Studio and consumer flow

- [ ] 4.1 Add business Zod contracts, API service, scoped query keys and cache
  invalidation. _R1-R5_
  - All React Query hooks for Studio must scope cache keys to both `workspaceId` and `campaignId`
  - Any hook where either `workspaceId` or `campaignId` is absent must throw/fail immediately rather than proceed with partial data; this prevents cache leakage between workspaces (R5.3)
- [ ] 4.2 Add owner-only Profile entry and separate `(business)` layout with
  Overview, Campaigns and Workspace. _R1_
- [ ] 4.3 Build campaign composer, preview, explicit publication confirmation
  and bounded publish-state polling. _R3_
  - The confirmation dialog must be shown as soon as the owner initiates publication; the UI must not block showing the dialog while waiting for a follower-count fetch (R3.3)
  - The eligible-follower count is loaded asynchronously and displayed as informational context inside the dialog once available
  - After the owner confirms and the request is submitted, the client must transition to a loading/publishing state and remain there until the backend confirms `live`; no success toast, checkmark or positive acknowledgement may be shown on acceptance (R3.6)
  - Only a backend-confirmed `live` result may be surfaced as a success state
- [ ] 4.4 Add authenticated public business profile and consumer Follow UI. _R2_
- [ ] 4.5 Make campaign Gasps visually normal in the consumer viewer while
  suppressing the business reaction CTA. _R4_
- [x] 4.6 Replace Chat tab with Metrics tab for business accounts. _R5_
  - For `accountType === 'business'` the `chat` tab slot in `CustomTabBar` is
    overridden to show a BarChart2 icon with label "Métricas" and navigate to
    `/(business)/metrics` via `router.push`.
  - Personal accounts are unaffected — they continue to see Chat.
  - `GET /businesses/:id/metrics` returns per-campaign breakdown
    (`queued`, `delivered`, `failed`, `opened`, `viewed`, `engagementRate`,
    `deliveryRate`) and workspace-level aggregates
    (`totalCampaigns`, `totalDelivered`, `totalOpened`, `totalViewed`,
    `avgEngagementRate`). R5.1 aggregate-only contract is preserved.
  - The Drizzle schema (`businesses.ts`), migration `0006_business_broadcast.sql`
    and the full `businesses` module (routes, service, schemas) were added to
    the backend as part of this task.

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
