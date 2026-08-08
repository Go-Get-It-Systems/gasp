# Tasks — Product Updates

> Kiro feature spec. Tasks 6.2 and 6.3 remain manual release checks.

- [x] 1. Define the Product Updates domain and local catalog
  - [x] 1.1 Add `gasp/services/api/schemas/productUpdate.schema.ts` with Zod schemas and inferred types for update, localization, status and user state.
  - [x] 1.2 Add `gasp/constants/productUpdates.ts` with validated sample content in `pt-BR` and `en`, including at least one released item and one future-facing item.
  - [x] 1.3 Add catalog validation and pure sorting/sectioning helpers for status priority, date order, month grouping, locale fallback and the five-item `Novo` cap.
  - [x] 1.4 Write unit tests for the helper behavior and invalid catalog cases.

- [x] 2. Add durable per-user read and feedback state
  - [x] 2.1 Implement `gasp/services/productUpdatesStorage.ts` with user-scoped, versioned AsyncStorage keys and safe parse fallbacks.
  - [x] 2.2 Implement `gasp/hooks/useProductUpdates.ts` to merge the catalog and persisted state, calculate unread count, mark an update read and save/retrieve feedback.
  - [x] 2.3 Write unit tests for empty, malformed and valid persistence, state updates, user separation and persistence failure behavior.

- [x] 3. Create the reusable Product Updates UI components
  - [x] 3.1 Build a Profile entry component with `Novidades`, the Sparkles icon and accessible unread semantics using `UnreadDot`.
  - [x] 3.2 Build the update list card and month section header with category labels, textual unread state, date formatting and full-card touch targets.
  - [x] 3.3 Build the update detail component with optional media, highlights, conditional CTA and persistent `Isso foi útil?` feedback.
  - [x] 3.4 Add Portuguese and English UI strings to the existing locale files.
  - [x] 3.5 Add component tests covering unread and empty states, accessibility labels, detail rendering, CTA absence/presence and feedback replacement.

- [x] 4. Integrate Profile navigation and modal presentation
  - [x] 4.1 Add the Novidades entry to `gasp/app/(tabs)/profile.tsx` and push `/(modals)/product-updates` when selected.
  - [x] 4.2 Add `gasp/app/(modals)/product-updates.tsx` with the list/detail navigation state, close/back behavior and empty state.
  - [x] 4.3 Ensure opening an update marks it read and returning to Profile updates/removes the unread indicator.
  - [x] 4.4 Add route and interaction tests for opening, closing, read-state changes and configured CTA navigation.

- [x] 5. Instrument the experience without coupling to an analytics vendor
  - [x] 5.1 Add `gasp/services/productUpdatesAnalytics.ts` with typed event payloads and a development-safe adapter.
  - [x] 5.2 Emit the open, detail view, CTA tap and feedback events from the integration layer.
  - [x] 5.3 Add tests asserting event names and payloads without relying on a vendor SDK.

- [ ] 6. Validate the feature end-to-end
  - [x] 6.1 Run focused Jest tests, then `npm test -- --runInBand` and `npm run lint` from `gasp/`.
  - [ ] 6.2 Manually verify the modal on iOS and Android for both locales, accessibility labels, 44-point targets, dark-theme contrast, empty state and all CTA routes.
  - [ ] 6.3 Review catalog copy against the content-governance checklist before enabling it in a release build.
