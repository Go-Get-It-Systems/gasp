# Requirements Document: Gasps Social Pulse

## Introduction

Gasps is currently a functional activity surface: friend requests, pending
Gasps, locally held reactions, and individual sent items share one vertical
list. The underlying product loop is strong -- capture, send, open, and react
-- but the page does not yet make that social return visible or emotionally
clear.

Gasps Social Pulse makes the personal GASP tab the private, camera-first home
for that loop. It prioritizes moments that need action, shows one sent moment
as a meaningful outcome, and turns received video reactions into a persistent
return path. It is not a public feed, a follower product, or a Business Studio
surface.

This MVP is deliberately narrow. It introduces a durable **Moment** aggregate
for personal batch sends and a server-backed received-reactions source. It
does not introduce Circles, scheduled prompts, rankings, widgets, or business
campaigns. Those are explicit follow-up experiments once the core loop is
measurable.

## Glossary

- **Social_Pulse**: The personal Gasps-tab experience that prioritizes incoming
  moments and their social return.
- **Moment**: One personal capture sent by one user to one or more existing
  friends at the same time. A Moment groups its recipient-specific Gasp rows.
- **Incoming_Gasp**: An unexpired personal Gasp addressed to the signed-in
  user and still eligible to open.
- **Latest_Moment**: The signed-in user's most recent personal Moment,
  including aggregate delivery and reaction counts.
- **Reaction_Return**: A persisted reaction received by the sender of a Gasp,
  with enough context to open the existing reaction/chat continuation.
- **Legacy_Gasp**: A Gasp created before Moments exist. It remains usable but
  is not fabricated into a new Moment record.
- **Business_Gasp**: A Gasp associated with `campaign_id`. It is outside this
  personal Social_Pulse MVP.

## Requirements

### Requirement 1: Personal scope and privacy

**User Story:** As a user, I want Gasps to feel like a private social space for
my friends, so that it does not become a public or commercial feed.

#### Acceptance Criteria

1. THE Social_Pulse SHALL query and render personal Gasp data only.
2. THE Social_Pulse SHALL NOT render Business Studio navigation, campaigns,
   business analytics, follow controls, or promotional sections.
3. THE Social_Pulse SHALL NOT add public discovery, followers, public likes,
   leaderboards, streak obligations, or algorithmic ranking.
4. THE UI SHALL keep Incoming_Gasp media visually protected until the existing
   Gasp viewer is opened; previews may use blurhash, blur, color, avatar, and
   expiry information but SHALL NOT reveal the original media.
5. THE API SHALL exclude Business_Gasps from Social_Pulse-specific endpoints.
6. Existing blocking, friendship, expiry, and permission checks SHALL remain
   authoritative for every Moment, Gasp, and Reaction_Return.

### Requirement 2: Attention-first Social Pulse screen

**User Story:** As a recipient, I want to immediately see what needs my
attention, so that opening and reacting to a Gasp feels effortless.

#### Acceptance Criteria

1. THE Gasps tab header SHALL identify the surface as `Gasps`, include a
   concise dynamic attention summary when Incoming_Gasps exist, and retain a
   fast camera entry point.
2. THE first content section SHALL be **Open now** and SHALL render only
   Incoming_Gasps ordered by most recent first.
3. Each Open-now item SHALL show sender identity, expiry state, and a
   privacy-safe visual treatment; it SHALL have a tap target that opens the
   existing Gasp viewer through typed navigation.
4. The screen SHALL use one unambiguous interaction instruction: tap opens a
   Gasp; hold remains an in-viewer behavior only. It SHALL NOT present
   contradictory `Tap` and `Hold` instructions on the same surface.
5. WHEN no Incoming_Gasps exist, THE screen SHALL replace the Open-now rail
   with a compact, camera-first empty state and SHALL NOT render a blank
   activity list.
6. Friend requests and low-urgency delivery activity SHALL remain visually
   secondary to Incoming_Gasps and Reaction_Returns.

### Requirement 3: A sent batch becomes one Moment

**User Story:** As a sender, I want one capture sent to several friends to be
shown as one meaningful event, so that I can understand its social return
without reading a technical delivery log.

#### Acceptance Criteria

1. WHEN a user sends a personal batch Gasp, THE backend SHALL create one
   Moment and recipient-specific Gasp rows linked to that Moment atomically.
2. A Moment SHALL retain sender id, shared media metadata, replay setting,
   creation/expiry times, and personal-scope identity.
3. The latest personal Moment endpoint SHALL return recipient count, delivered
   count, opened count, reaction count, expiry state, and up to three safe
   recipient/reaction identity summaries.
4. THE UI SHALL render at most one **Your latest moment** card in the initial
   viewport and SHALL use human language such as `sent to 4 friends`,
   `3 opened`, and `1 reaction`.
5. The Latest_Moment card SHALL never expose the original media in clear form
   before a deliberate user action.
6. A Legacy_Gasp SHALL remain available in existing sent-history behavior and
   SHALL NOT be migrated or grouped heuristically on the client.
7. A failed Moment creation SHALL create no partially linked recipient Gasp
   rows; a failed recipient authorization SHALL reject the send before writes.

### Requirement 4: Reactions are a durable social return

**User Story:** As a sender, I want reactions to remain visible after I leave
the screen, so that the payoff of sending a Gasp is not lost with local state.

#### Acceptance Criteria

1. THE backend SHALL provide a cursor-paginated personal Reaction_Return
   endpoint for reactions where the signed-in user sent the original Gasp.
2. Each Reaction_Return SHALL include reaction id, Gasp id, reactor identity,
   reaction media URL, original-media metadata required by the existing
   reaction presentation, capture time, conversation id, and reaction-message
   id when available.
3. THE frontend SHALL use React Query for Reaction_Return server state and
   SHALL NOT treat `gaspStore.reactions` as the durable source for this screen.
4. THE Social_Pulse SHALL show a **Reactions for you** section above
   low-urgency activity when Reaction_Returns exist.
5. Tapping a Reaction_Return SHALL continue through the existing typed
   reaction/chat route contract; it SHALL not create a duplicate conversation.
6. A received reaction socket event SHALL update or invalidate the
   Reaction_Return query and Latest_Moment query so the result becomes visible
   without manual refresh.
7. Reactions received for Business_Gasps SHALL not appear in the personal
   Reaction_Return endpoint.

### Requirement 5: Social-media quality without feed pressure

**User Story:** As a user, I want the page to feel alive and polished, so that
I enjoy returning to it without being pushed into compulsive use.

#### Acceptance Criteria

1. The screen SHALL use the existing dark visual system, countdown language,
   and privacy-safe blur treatment; accent color SHALL communicate state, not
   decorate every card.
2. New/opened, expiring, sent, and reaction states SHALL have distinguishable
   text and icon treatments and SHALL NOT rely on color alone.
3. The Open-now rail, Latest_Moment card, and Reaction_Return items SHALL
   have stable loading skeletons, empty states, and long-name fallbacks.
4. Animation and haptic feedback SHALL be brief, interruptible, and tied to a
   user action or meaningful realtime update.
5. Every new interactive element SHALL have an accessibility label, role, and
   minimum tappable area consistent with the rest of the app.
6. All user-facing strings SHALL be localized through existing locale files.

### Requirement 6: Architecture and regression safety

**User Story:** As the product team, we want the new surface to extend the
existing app safely, so that a visual improvement does not break the ephemeral
media lifecycle.

#### Acceptance Criteria

1. Server state SHALL use React Query keys and Zod-derived contracts; Zustand
   SHALL contain UI-only state.
2. New API responses SHALL be validated at the frontend boundary and no new
   manual domain types SHALL be introduced.
3. All new parameterized navigation SHALL use typed navigation helpers.
4. Socket listeners SHALL update React Query's singleton cache and SHALL clean
   up correctly on reconnect/unmount according to the existing listener model.
5. New components SHALL remain focused and follow the repository's component
   size and accessibility rules.
6. Automated coverage SHALL include Moment aggregation, personal/business
   exclusion, response validation, screen state priority, privacy treatment,
   realtime cache update, and navigation fallback.
7. Manual device QA SHALL cover photo and video Gasps, expiry, replayable
   Gasps, no network after tap, long names, empty states, and a reaction
   arriving while the tab is active and inactive.

## Deferred experiments

These ideas are intentionally not part of this MVP and require a separate
decision plus measurable success criteria:

| Experiment | Why defer it |
| --- | --- |
| Gasp Circles | Needs group ownership, membership, invitations, leave/delete rules, and audience controls. |
| Gasp Pulse prompts | Needs opt-in scheduling, frequency caps, timezone rules, and notification preferences. |
| Weekly Gasp Recap | Needs a retention/privacy policy for otherwise ephemeral content. |
| Home-screen widget or Live Activity | Needs iOS extension configuration, native builds, app-group sharing, and dedicated notification tokens. |
| Public discovery or Business delivery in Pulse | Conflicts with the private personal scope selected for this feature. |
