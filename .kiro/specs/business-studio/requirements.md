# Requirements Document: Business Broadcast MVP

## Goal

Deliver a **managed-pilot Business Broadcast**: one approved demo business can
publish a media campaign to an explicitly opted-in, capped audience. Followers
receive it through the existing GASP viewer; the business sees only aggregate
delivery and viewing results.

Business Broadcast is a separate workspace and identity, not a personal-user
type or a new consumer tab. It proves a direct, consent-based brand-to-audience
loop without turning GASP into a creator marketplace, a chat channel, or a
user-generated-content system.

## Confirmed pilot decisions

| Topic | Decision |
| --- | --- |
| First workspace | Controlled demo account |
| Audience cap | 20 followers |
| Frequency cap | One campaign per day |
| Campaign expiry | Existing 24-hour Gasp expiry/replay rules |
| Recipient experience | Existing Gasp view flow; no business reaction CTA |
| Analytics | Aggregate queued, delivered, opened, viewed and failed counts only |

## Requirements

### R1 — Separate Studio access

1. Only an active owner membership returned by `GET /businesses/mine` may
   expose the `Business Studio` entry from personal Profile.
2. Studio SHALL use its own `(business)` Expo Router group with Overview,
   Campaigns and Workspace. Existing consumer tabs remain unchanged.
3. All Studio reads and writes SHALL be server-authorised. A non-member sees a
   safe unavailable state with no operational data.
4. Exit returns to personal Profile without changing personal caches, chats or
   pending Gasps.

### R2 — Managed workspace and public business profile

1. A Business_Workspace is a separate domain entity with handle, display name,
   avatar, bio, verification and active state.
2. A platform administrator provisions the demo workspace and one owner. There
   is no self-service workspace creation, verification or role-management UI.
3. An active, verified workspace has an authenticated public profile with a
   consumer-safe identity, follower count and `Follow`/`Following` action.
4. Follow/unfollow is explicit, idempotent and separate from friendships and
   conversations. Blocks override discovery, follow and delivery.
5. The workspace never receives follower phone numbers, presence, friendship
   graph or a list of users who did not open a campaign.

### R3 — Campaign creation and lifecycle

1. An owner can create, edit and preview a campaign draft with title, media,
   optional text overlay and existing replayable metadata.
2. The composer reuses existing capture/gallery upload capability, but never
   opens a friend picker.
3. The owner explicitly confirms publication after seeing the eligible-follower
   count. Once publishing starts, media and audience snapshot are immutable.
4. Backend-owned states are `draft → publishing → live|failed → closed`.
5. The client must show loading, empty, publishing, failed and retryable
   states; accepted publication is never represented as immediate success.

### R4 — Server-side Broadcast delivery

1. Publish runs through a dedicated BullMQ job. The mobile client never loops
   through followers or calls personal `/gasps/batch`.
2. Publication snapshots active eligible followers, respects follow state,
   blocks, workspace activity and the cap, then creates one delivery and one
   normal Gasp per follower.
3. `gasps.campaign_id` remains nullable so personal Gasp behaviour is
   preserved. Deliveries use a unique `(campaign_id, recipient_id)` boundary
   and deterministic job id to prevent duplicates across retries.
4. Generated campaign Gasps retain existing 24-hour expiry, hold/view,
   notification, Socket.IO and cleanup behaviour. The notification uses the
   business identity; recipients never enter Studio.
5. Campaign Gasps SHALL not invite, capture or route a reaction to the
   business. A campaign must not create a business DM or conversation.

### R5 — Broadcast overview and privacy-safe analytics

1. Overview and campaign detail show active/latest campaign, follower count,
   and aggregate `queued`, `delivered`, `failed`, `opened` and `viewed` counts.
2. There is no per-follower viewing list, reaction gallery, selected-content
   count, engagement percentage or rich analytics in this MVP.
3. Query keys must include workspace and campaign ids to prevent cache leakage
   between workspaces.

### R6 — Safety, configuration and controlled rollout

1. Configuration SHALL provide `BUSINESS_STUDIO_ENABLED`, an allow-list,
   follower cap, campaign-frequency cap and fan-out chunk size; defaults leave
   the feature off.
2. With the flag off, Studio entry and publishing are denied while consumer
   features remain unaffected. Disabling it is the immediate rollback.
3. Logs/Sentry may include workspace id, campaign id, operation and aggregate
   counts, never raw media URLs, tokens, phone numbers or recipient lists.
4. Migrations are additive and preserve all existing personal-user, Gasp,
   notification and cleanup contracts.
5. Automated tests cover membership, follow/block, lifecycle, duplicate
   prevention, privacy-safe aggregates and campaign reaction suppression.
6. Device QA uses one owner and two followers to validate follow, publish,
   background push, hold/view, unfollow-before-publish, block, exit and
   feature-flag rollback.

## Explicitly deferred

- Reactions in a business gallery, selection and reel rendering/export.
- Publicly featured reactions. This requires a separate explicit user-consent
  and media-rights design; selected content must never become public by default.
- Creator Pro/media kit, brand collaboration marketplace, payments or payouts.
- Team roles, scheduling, switching workspaces, public ranking/categories,
  business DMs, ads, billing and rich analytics.
- Firebase signed-URL hardening, which remains a platform-security prerequisite
  before broad/private brand use.
