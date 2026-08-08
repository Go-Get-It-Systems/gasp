# Requirements — Product Updates

> Kiro feature spec.

## Overview

Build a **Novidades** experience in the GASP app. It lets a signed-in user see product changes that are available now, understand their benefit, and open a related feature when an action is relevant. A small, clearly labeled future-facing section may communicate confirmed work in progress without promising dates.

The initial release is read-only: users can view updates, mark them as read by opening them, and provide a lightweight usefulness signal. It must not expose engineering tickets, sprint data, owners, or internal technical details.

## User story 1 — Find product updates

**As a** signed-in GASP user,
**I want** to open a clearly named Novidades entry from my profile,
**so that** I can discover what changed in the app.

### Acceptance criteria

1. WHEN a signed-in user opens the Profile tab, THE SYSTEM SHALL provide an accessible entry point labeled `Novidades`.
2. WHEN one or more published updates are unread, THE SYSTEM SHALL show a non-color-only unread indicator on the Novidades entry point.
3. WHEN the user selects the Novidades entry point, THE SYSTEM SHALL open the Product Updates screen as a modal.
4. WHEN no published update exists, THE SYSTEM SHALL show `Ainda não há novidades por aqui. Volte em breve.` instead of an empty list.

## User story 2 — Understand recent work

**As a** signed-in GASP user,
**I want** to read recent updates in plain language,
**so that** I understand what was delivered and why it matters to me.

### Acceptance criteria

1. WHEN the Product Updates screen opens, THE SYSTEM SHALL list published updates in descending publication-date order.
2. WHEN an update is displayed in the list, THE SYSTEM SHALL show its category, title, user-benefit summary, and publication date.
3. WHEN an update has not been read, THE SYSTEM SHALL identify it with a textual `Novo` label in addition to any visual styling.
4. WHEN updates span multiple calendar months, THE SYSTEM SHALL group the list with readable month headings.
5. WHEN an update is `released` or `improved`, THE SYSTEM SHALL use language that describes the user-facing outcome rather than implementation details.
6. WHEN the update list is rendered, THE SYSTEM SHALL show no more than five items labeled `Novo`.

## User story 3 — Read the detail and take action

**As a** signed-in GASP user,
**I want** to see enough detail about an update and try it when possible,
**so that** the announcement leads to real product use.

### Acceptance criteria

1. WHEN the user selects an update card, THE SYSTEM SHALL open a detail view with its title, category, publication date, summary, and explanatory points.
2. WHEN an update contains media, THE SYSTEM SHALL display that media with alternative text.
3. WHEN an update has a configured action, THE SYSTEM SHALL show one clear CTA and navigate to its configured in-app route when selected.
4. WHEN an update has no configured action, THE SYSTEM SHALL not display an inactive or placeholder CTA.
5. WHEN the user opens an unread published update, THE SYSTEM SHALL persist the update as read for that user on the device.
6. WHEN the user returns to the list after reading the last unread update, THE SYSTEM SHALL remove the unread indicator from the Profile entry point.

## User story 4 — Transparently communicate upcoming work

**As a** signed-in GASP user,
**I want** to distinguish available functionality from future work,
**so that** I know what I can use now and what is only being prepared.

### Acceptance criteria

1. WHEN the team publishes an update with status `in_progress` or `coming_soon`, THE SYSTEM SHALL label it `Em desenvolvimento` or `Em breve` respectively.
2. WHEN a future-facing update is displayed, THE SYSTEM SHALL not expose a delivery date unless the entry explicitly includes an approved public date.
3. WHEN both available and future-facing updates exist, THE SYSTEM SHALL list `released` and `improved` entries before future-facing entries.
4. THE SYSTEM SHALL not make a future-facing entry the featured item while an unread `released` or `improved` entry exists.

## User story 5 — Share simple feedback

**As a** signed-in GASP user,
**I want** to indicate whether an update was useful,
**so that** the product team can improve how it communicates changes.

### Acceptance criteria

1. WHEN the user views an update detail, THE SYSTEM SHALL offer `Isso foi útil?` with `Sim` and `Ainda não` choices.
2. WHEN the user submits feedback, THE SYSTEM SHALL record one feedback value for that update on the device and acknowledge the response without blocking navigation.
3. WHEN feedback has already been submitted for an update, THE SYSTEM SHALL show the recorded selection and SHALL NOT prompt the user again in the same installation.

## User story 6 — Accessibility and localization

**As a** user of assistive technology or a supported app language,
**I want** Product Updates to be accessible and localized,
**so that** I can use it with the rest of the app.

### Acceptance criteria

1. THE SYSTEM SHALL provide accessible labels, roles, and states for every interactive Product Updates control.
2. THE SYSTEM SHALL support a minimum target touch area of 44 by 44 points for interactive controls.
3. WHEN the app language is Portuguese (Brazil) or English, THE SYSTEM SHALL display the Product Updates interface and update content in that language.
4. THE SYSTEM SHALL NOT rely only on color to convey an unread state or update category.

## User story 7 — Measure use of the feature

**As a** product team member,
**I want** event instrumentation around Product Updates,
**so that** I can evaluate discovery and adoption.

### Acceptance criteria

1. WHEN the Product Updates screen opens, THE SYSTEM SHALL record `product_updates_opened` with `source` and `unread_count`.
2. WHEN an update detail opens, THE SYSTEM SHALL record `product_update_viewed` with `update_id`, `status`, and `position`.
3. WHEN a CTA is selected, THE SYSTEM SHALL record `product_update_cta_tapped` with `update_id` and `cta_label`.
4. WHEN feedback is submitted, THE SYSTEM SHALL record `product_update_feedback_submitted` with `update_id` and `helpful`.
