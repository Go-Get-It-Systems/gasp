# Requirements Document

> **Repositório do backend:** Todas as criações e alterações de backend devem ser feitas no repositório localizado em `C:\Users\erick.ERIKHENRIQUE\Downloads\Projetos\GASP\gasp-backend-main`.

## Introduction

Deliver a managed-pilot Business Broadcast: one approved demo business can publish a media campaign to an explicitly opted-in, capped audience. Followers receive it through the existing GASP viewer; the business sees only aggregate delivery and viewing results.

Business Broadcast is a separate workspace and identity, not a personal-user type or a new consumer tab. It proves a direct, consent-based brand-to-audience loop without turning GASP into a creator marketplace, a chat channel, or a user-generated-content system.

## Confirmed pilot decisions

| Topic | Decision |
| --- | --- |
| First workspace | Controlled demo account |
| Audience cap | 20 followers |
| Frequency cap | One campaign per day |
| Campaign expiry | Existing 24-hour Gasp expiry/replay rules |
| Recipient experience | Existing Gasp view flow; no business reaction CTA |
| Analytics | Aggregate queued, delivered, opened, viewed and failed counts only |

## Glossary

- **Business_Workspace**: A separate domain entity representing a business on GASP, with its own handle, display name, avatar, bio, verification status and active state. Distinct from a personal user account.
- **Studio**: The dedicated Expo Router group `(business)` that provides business owners with Overview, Campaigns and Workspace screens. Not accessible to regular consumers.
- **Campaign**: A media broadcast created by a business owner, consisting of a title, media asset, optional text overlay and replayable metadata, distributed to opted-in followers.
- **Delivery**: A server-side record linking one Campaign to one recipient follower, tracked with states queued, delivered, failed, opened and viewed.
- **Owner**: A user holding an active owner membership in a Business_Workspace, as returned by `GET /businesses/mine`.
- **Follower**: A consumer user who has explicitly opted in to follow a Business_Workspace and has not been blocked.
- **BullMQ**: The server-side job queue used to fan out campaign deliveries without client-side looping.
- **Fan-out**: The server process that snapshots eligible followers and creates one Delivery and one Gasp per follower for a given campaign.
- **BUSINESS_STUDIO_ENABLED**: A server-side feature flag that gates all Studio entry points and publishing operations.

## Requirements

### Requirement 1: Separate Studio Access

**User Story:** As a business owner, I want a dedicated Studio section in the app that is only accessible when I have an active ownership role, so that business operations are fully separated from my personal consumer experience.

#### Acceptance Criteria

1. WHEN `GET /businesses/mine` returns an active owner membership, THE Studio SHALL expose the Business Studio entry point from the personal Profile screen.
2. IF `GET /businesses/mine` does not return an active owner membership, THEN THE Studio SHALL hide the Business Studio entry point and show a safe unavailable state with no operational data.
3. THE Studio SHALL use its own `(business)` Expo Router group containing Overview, Campaigns and Workspace screens, leaving existing consumer tabs unchanged.
4. THE Studio SHALL require server-side authorisation for all reads and writes.
5. WHEN the owner exits Studio, THE App SHALL return to the personal Profile screen without modifying personal caches, chats or pending Gasps.
6. THE Studio SHALL not isolate personal data from Studio operations while the owner is actively using Studio; protection of personal caches, chats and pending Gasps applies only at the moment of Studio exit, not during active Studio use.

---

### Requirement 2: Managed Workspace and Public Business Profile

**User Story:** As a platform administrator, I want to provision and manage business workspaces and their owner memberships, so that only approved businesses can operate on the platform without exposing self-service creation or role management to end users.

#### Acceptance Criteria

1. THE Business_Workspace SHALL be a separate domain entity identified by a unique handle, display name, avatar, bio, verification status and active state.
2. THE Platform_Administrator SHALL provision the demo workspace and assign one owner; there is no self-service workspace creation, verification or role-management UI available to end users.
3. WHEN a workspace is both active and verified, THE Business_Workspace SHALL expose an authenticated public profile displaying a consumer-safe identity, follower count and a Follow/Following action.
4. WHEN a consumer follows or unfollows a Business_Workspace, THE System SHALL record the action as explicit, idempotent and independent of friendships and conversations.
5. THE System SHALL maintain `explicit=false`, `idempotent=true` and `independent=true` as the default state for all user–workspace relationships even when no follow or unfollow action has occurred.
6. WHEN a consumer block is active, THE System SHALL atomically override discovery, follow AND delivery together; partial blocking states where only some of these are overridden SHALL not occur.
7. THE Business_Workspace SHALL never receive follower phone numbers, presence data, friendship graph data or a list of users who did not open a campaign.

---

### Requirement 3: Campaign Creation and Lifecycle

**User Story:** As a business owner, I want to compose, preview and publish media campaigns using familiar capture and gallery tools, so that I can broadcast content to my opted-in followers through a clear, controlled publication flow.

#### Acceptance Criteria

1. WHEN an owner opens the campaign composer, THE Composer SHALL allow creation, editing and preview of a campaign draft containing a title, media asset, optional text overlay and existing replayable metadata.
2. THE Composer SHALL reuse the existing capture and gallery upload capability and SHALL never open a friend picker.
3. WHEN an owner initiates publication, THE System SHALL require explicit owner confirmation before proceeding; THE System SHOULD display the eligible-follower count as informational context, but displaying the follower count is not a prerequisite to showing the confirmation dialog.
4. WHEN publication begins, THE System SHALL make the media asset and audience snapshot immutable for the lifetime of the campaign.
5. THE Backend SHALL own and enforce the campaign state machine: `draft → publishing → live | failed → closed`.
6. THE Client SHALL display only loading or publishing states after submission until the backend confirms `live` status; no positive acknowledgement message SHALL be shown upon acceptance, and accepted publication SHALL never be represented as an immediate success.

---

### Requirement 4: Server-Side Broadcast Delivery

**User Story:** As a business owner, I want campaign delivery to be handled entirely on the server, so that my broadcasts reach opted-in followers reliably without any client-side looping or manual batching.

#### Acceptance Criteria

1. WHEN a campaign is published, THE BullMQ_Job SHALL be the exclusive delivery mechanism for campaign fan-out; the mobile client SHALL never loop through followers or call the personal `/gasps/batch` endpoint for campaign publication fan-out, though unrelated client use of `/gasps/batch` is not restricted.
2. WHEN the fan-out job executes, THE Fan_Out_Job SHALL snapshot active eligible followers, respect follow state, blocks, workspace activity and the audience cap, then create one Delivery record and one Gasp per follower.
3. THE System SHALL keep `gasps.campaign_id` nullable so that personal Gasp behaviour is preserved for non-campaign Gasps.
4. THE System SHALL enforce a unique `(campaign_id, recipient_id)` boundary and use a deterministic job id to prevent duplicate deliveries across retries.
5. WHEN a campaign Gasp is created, THE System SHALL apply existing 24-hour expiry, hold/view, notification, Socket.IO and cleanup behaviour, using the business identity in the notification; recipients SHALL never be routed into Studio.
6. THE Campaign_Gasp SHALL not invite, capture or route a reaction to the business, and a campaign SHALL not create a business DM or conversation.
7. IF a recipient of a Campaign_Gasp navigates to Studio through a valid entry point (such as owning a business), THE System SHALL allow normal Studio access; active campaign Gasps in the recipient's consumer inbox SHALL not block Studio access.

---

### Requirement 5: Broadcast Overview and Privacy-Safe Analytics

**User Story:** As a business owner, I want to see aggregate delivery and viewing counts for my campaigns, so that I can understand overall reach without accessing any individually identifiable follower data.

#### Acceptance Criteria

1. THE Studio Overview SHALL display the active or latest campaign, the workspace follower count, and aggregate counts for `queued`, `delivered`, `failed`, `opened` and `viewed` deliveries.
2. THE Studio SHALL not expose a per-follower viewing list, reaction gallery, selected-content count, engagement percentage or any rich analytics beyond the aggregate counts defined in criterion 1.
3. THE System SHALL include both the workspace id and the campaign id in all React Query cache keys related to Studio; queries where either the workspace id or the campaign id is absent SHALL fail immediately, preventing cache leakage between workspaces.

---

### Requirement 6: Safety, Configuration and Controlled Rollout

**User Story:** As a platform operator, I want all Business Broadcast behaviour gated behind a server-side feature flag with configurable caps, so that I can enable the pilot for approved accounts and roll back instantly if needed.

#### Acceptance Criteria

1. THE Configuration SHALL provide the `BUSINESS_STUDIO_ENABLED` flag, an owner allow-list, a follower cap, a campaign-frequency cap and a fan-out chunk size; all defaults SHALL leave the feature disabled.
2. THE Configuration SHALL accept a follower cap of zero as a valid setting, which effectively prevents campaign delivery while the feature remains otherwise enabled.
3. WHILE `BUSINESS_STUDIO_ENABLED` is off, THE System SHALL deny publishing operations while leaving all consumer features unaffected; Studio entry for owners who are in the allow-list MAY still be permitted at implementation discretion; disabling the flag SHALL serve as the immediate rollback mechanism.
4. THE Logging_System SHALL include workspace id, campaign id, operation name and aggregate counts in logs and Sentry events, and SHALL never include raw media URLs, tokens, phone numbers or recipient lists.
5. THE Database_Migrations SHALL be additive and preserve all existing personal-user, Gasp, notification and cleanup contracts.
6. THE Test_Suite SHALL cover membership validation, follow/block enforcement, campaign lifecycle transitions, duplicate-delivery prevention, privacy-safe aggregate computation and campaign reaction suppression.
7. WHEN device QA is executed, THE QA_Process SHALL validate follow, publish, background push, hold/view, unfollow-before-publish, block, exit and feature-flag rollback using one owner account and two follower accounts.

---

## Explicitly Deferred

The following items are out of scope for Business Broadcast MVP and are recorded as candidates for future specs:

- **Featured Reactions** _(future spec)_: Reactions in a business gallery, selection and reel rendering/export. Publicly featuring user reactions requires a separate explicit user-consent and media-rights design; selected content must never become public by default.
- **Creator Pro** _(future spec)_: Media kit, brand collaboration marketplace, payments or payouts.
- Team roles, scheduling, switching workspaces, public ranking/categories, business DMs, ads, billing and rich analytics.
- Firebase signed-URL hardening, which remains a platform-security prerequisite before broad/private brand use.
