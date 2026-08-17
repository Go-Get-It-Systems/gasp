# Requirements Document: Business Studio MVP

## Goal

Deliver a **managed-pilot Business Studio**: a truly separate area of GASP
where one approved business account can publish a media campaign to consenting
followers, see aggregate results, inspect reactions in a tiled gallery, and
mark reactions for later curation.

This is not a generic “business mode” inside the consumer Profile. It has
separate routes, permissions, APIs, tables, and operational screens. The
consumer app remains friends-first and continues to own personal Camera,
Gasps, Chat, Discover, and Profile.

The MVP deliberately proves George's requested brand point of view without
committing us to a full creator platform, large-audience infrastructure, or
reel-rendering pipeline on day one.

---

## MVP decisions and assumptions

| Topic | MVP decision | Reason |
| --- | --- | --- |
| Workspace creation | Platform administrator provisions one pilot workspace and its owner directly in the database/admin script. | Avoids self-serve onboarding, verification, payment and support flows. |
| Team access | One `owner` is required; the table stores a future-ready role, but team management UI is deferred. | Supports correct ownership without building multi-user administration. |
| Audience | Users explicitly follow/unfollow a business. Pilot has a server-configured follower cap. | Gives a real opt-in audience and avoids friendship misuse. |
| Campaign | Draft → publish → live/failed → closed. No schedule in MVP. | Reduces state/jobs and still demonstrates the core loop. |
| Delivery | Backend queue fans out individual existing Gasps. | Retains expiry, viewer, reactions, push, safety and cleanup behaviour. |
| Reactions | Business sees a campaign-scoped gallery and can select/unselect reactions. | Delivers the requested “many reactions” point of view. |
| Compilation | Persist selected reactions only. No rendering, exporting or publishing a reel. | Avoids FFmpeg render orchestration and consent decisions in the pilot. |
| Analytics | Aggregate delivered/opened/reacted/selected counts only. | Useful and privacy-preserving; no viewer surveillance. |

---

## Glossary

- **Business_Workspace**: A brand or creator identity separate from a personal
  GASP user.
- **Business_Member**: A personal user authorised to operate a workspace. MVP
  requires the `owner` role only.
- **Follower**: A personal user who opted in to receive that workspace's
  campaigns; it is not a friendship.
- **Campaign**: One media post belonging to a Business_Workspace.
- **Campaign_Delivery**: A durable record that maps one campaign to one
  recipient and its generated existing `gasp`.
- **Selection**: A reaction marked by a Business_Member for a future reel or
  showcase. It is not an exported asset.

---

## Requirements

### R1 — Separate Studio access

**User story:** As an approved business operator, I want an entirely separate
Studio, so that campaign work never mixes with my personal GASP activity.

#### Acceptance criteria

1. The mobile app SHALL expose `Business Studio` from personal Profile only
   when `GET /businesses/mine` returns an active workspace membership.
2. Studio SHALL live under an independent Expo Router group, `(business)`,
   with its own navigation: `Overview`, `Campaigns`, `Reactions`, and
   `Workspace`.
3. Existing `CustomTabBar` SHALL remain unchanged: Discover, Camera, Gasps,
   Chat, and Profile only.
4. Every Studio route SHALL require an active server-validated membership.
   A non-member shall see a safe unavailable state and no operational data.
5. Leaving Studio SHALL return the user to personal Profile without changing
   their personal tabs, caches, chats, or pending Gasps.

### R2 — Workspace identity and managed provisioning

**User story:** As a release owner, I want a controlled business identity,
so that a pilot workspace has clear ownership and cannot be forged by users.

#### Acceptance criteria

1. Business_Workspace SHALL be a new domain entity, not a new `users` type.
2. It SHALL have id, unique handle, display name, avatar, bio, verification
   state, active state, timestamps, and an owner membership.
3. An owner membership SHALL point to an existing authenticated personal user.
4. Only an administrator seed/script/internal process may create or verify a
   workspace in MVP. No mobile endpoint may self-upgrade a user.
5. The API SHALL enforce owner membership server-side for all Studio reads and
   writes. Client-side visibility is never authorisation.
6. The role column may support `owner`, `editor`, and `viewer`, but only owner
   behaviour is delivered in MVP.

### R3 — Public profile and opt-in following

**User story:** As a personal user, I want to opt in or out of a business
audience, so that I control whether its campaigns reach me.

#### Acceptance criteria

1. An active verified Business_Workspace SHALL have an authenticated public
   profile route with identity, bio, verification label, follower count, and
   `Follow`/`Following` action.
2. Follow and unfollow SHALL be idempotent, explicit, and stored separately
   from friendships and conversations.
3. A user who unfollows before a campaign's audience snapshot SHALL not
   receive that campaign.
4. Existing block/report policy SHALL override business discovery, follow,
   delivery, and reaction visibility.
5. The business SHALL not obtain follower phone numbers, presence, friendship
   graph, or a list of users who did not open/react.
6. MVP may link the public profile directly from a seeded/discoverable card;
   business ranking, categories, and recommendation algorithms are deferred.

### R4 — Campaign creation and lifecycle

**User story:** As the owner, I want to create and deliberately publish a
campaign, so that audience delivery is controlled and recoverable.

#### Acceptance criteria

1. A Campaign SHALL store workspace id, owner id, title, media URL/type,
   blurhash, optional text overlay, replayable flag, state, timestamps,
   audience snapshot count, and sanitised failure reason.
2. The Studio composer SHALL reuse existing camera/gallery media and text
   overlay capability but SHALL create a campaign draft, not open a friend
   recipient picker.
3. Drafts MAY be edited; once publication starts, media and audience snapshot
   SHALL be immutable.
4. Owner SHALL explicitly confirm publish after seeing media preview and the
   current eligible-follower count.
5. Valid states are `draft`, `publishing`, `live`, `failed`, and `closed`.
   State transitions are backend-owned.
6. A close action SHALL prevent new visibility/public promotion but SHALL not
   alter the existing expiry lifecycle of already delivered Gasps.
7. The client SHALL show publishing, failed, empty, loading and retryable
   states; it SHALL not display a partial publication as successful.

### R5 — Server-side campaign fan-out

**User story:** As the owner, I want a campaign reliably delivered to my
followers, so that the scale-up preserves the normal GASP experience.

#### Acceptance criteria

1. Publishing SHALL run on the backend through a dedicated BullMQ job. The
   mobile client SHALL never iterate through followers or call `/gasps/batch`.
2. The service SHALL snapshot active, eligible followers at publication start,
   respecting follow status, blocks, workspace active state, and pilot cap.
3. It SHALL create one Campaign_Delivery and one normal `gasp` per recipient.
   `gasps.campaign_id` SHALL be nullable for backward compatibility.
4. A unique `(campaign_id, recipient_id)` constraint and deterministic job id
   SHALL make fan-out idempotent across retries.
5. Generated Gasps SHALL retain current 24-hour expiry, hold/view/reaction
   flow, notification handling, Socket.IO event, composite reaction behaviour,
   and cleanup worker behaviour.
6. The business identity SHALL be used in the notification label. Recipients
   open the existing Gasp viewer, never Studio.
7. Campaign progress SHALL expose aggregate `queued`, `delivered`, `failed`,
   `opened`, and `reacted` counts only.

### R6 — Studio dashboard and reaction gallery

**User story:** As the owner, I want to review a campaign and its reactions,
so that I can understand engagement and identify the strongest responses.

#### Acceptance criteria

1. Overview SHALL show active campaign, follower count, and aggregate
   delivered/opened/reacted counts for the selected/default campaign.
2. Campaigns SHALL list campaigns with state and aggregate counts; selecting
   one opens media preview, delivery funnel, and reaction count.
3. Reactions SHALL be campaign-scoped and rendered in a cursor-paginated
   2- or 3-column grid. It SHALL support `Newest` and `Selected` filters.
4. Selecting a reaction SHALL open a detail view that reuses the existing
   reaction/composite playback when available.
5. Reaction actor fields SHALL use a privacy-safe transformer. No phone,
   presence, private profile data, or friend graph may enter Studio payloads.
6. Query keys and caches SHALL include workspace and campaign ids so one
   workspace's data never appears in another.

### R7 — Curation selections, not reel rendering

**User story:** As the owner, I want to mark standout reactions, so that I can
prepare a future business reel without prematurely exporting user media.

#### Acceptance criteria

1. Owner SHALL select/unselect a reaction from its own campaign only.
2. Selection SHALL be idempotent and persisted with campaign id, reaction id,
   selector user id, and timestamp.
3. The Studio SHALL show selected count and the `Selected` gallery filter.
4. A selected reaction SHALL not be downloaded, exported, rendered, or
   published in MVP.
5. If a reaction becomes unavailable due to block, moderation, or expiry, it
   SHALL no longer be selectable and SHALL disappear from the safe gallery.

### R8 — Safety, configuration, and verification

**User story:** As a release owner, I want a contained pilot, so that the new
audience mechanism does not introduce unsafe mass messaging or regressions.

#### Acceptance criteria

1. Backend config SHALL define `BUSINESS_STUDIO_ENABLED`, workspace allow-list,
   follower cap, campaign-frequency cap, and fan-out chunk size.
2. When disabled, Studio entry and campaign publication SHALL be denied while
   existing consumer features remain unaffected.
3. The backend SHALL record sanitised Sentry/log context for workspace id,
   campaign id, operation and aggregate counts; raw media URLs, tokens, phone
   numbers, and recipient lists SHALL not be logged.
4. Database migrations SHALL be additive and preserve every existing personal
   user, Gasp, reaction, notification, and cleanup contract.
5. Automated tests SHALL cover membership enforcement, follow/block behaviour,
   campaign states, fan-out duplicate prevention, aggregate counts, and
   selection rules.
6. Device QA SHALL use one owner and at least two personal followers to verify
   follow, publish, background notification, view, reaction, Studio gallery,
   selection, unfollow-before-publish, block, and safe Studio exit.
7. A capped queue/load test SHALL complete before raising the follower cap.

---

## Explicitly deferred after MVP

| Capability | Why deferred | Next phase trigger |
| --- | --- | --- |
| Editor/viewer invitations and workspace switching | Adds team-management UX and permissions. | Pilot owner flow stable. |
| Campaign scheduling | Adds timezone and scheduled-job recovery complexity. | Manual publish validated. |
| Public business search/ranking/categories | Requires Discovery product decisions. | More than one pilot brand. |
| Rich analytics, charts and time ranges | Requires reporting model and product metric decisions. | Metrics needed for commercial use. |
| Reel draft, rendering, export and sharing | Needs FFmpeg orchestration, content rights and consent rules. | Legal/product approval on reuse. |
| Business DMs, ads, billing, creator payouts, web dashboard | Separate product areas. | Explicit commercial roadmap approval. |
| Signed Firebase Storage URLs | Existing platform hardening item; not unique to Studio. | Before scaling beyond controlled pilot. |

## Questions to close before implementation

1. What is the pilot follower cap: 20, 50, or 100?
2. Is the first business a real brand or a controlled demo account only?
3. May the owner see reactor display name/avatar in the pilot, or should the
   gallery be anonymous from day one?
4. Should a business campaign have the same 24-hour expiry as a personal Gasp?
5. What exact frequency cap should apply: one campaign per day, per week, or
   no cap within the controlled beta?
