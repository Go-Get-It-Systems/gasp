# Requirements Document

## Introduction

This spec defines the UI polish pass for the **Super Imposed Reaction** flow. The current reaction preview in `img-logs/2.jpeg` proves the core side-by-side idea is understandable: the recipient's reaction occupies the left 1/3 of the frame and the original gasp occupies the right 2/3. However, the preview still needs better framing, clearer panel labels, a cleaner send state, and less visual noise. The full-screen playback state shown in `img-logs/3.jpeg` must be corrected because it shows large black dead space, misaligned media, and cropped content that makes the composite feel broken.

This spec does not change recording, upload, composite generation, or the backend layout contract. It only improves the client-side visual presentation across preview, chat, and playback so the same reaction artifact feels consistent end to end.

---

## Glossary

- **Reaction_UI_Polish**: This follow-up feature focused on presentation and flow clarity for the existing reaction composite.
- **ReactionPreview**: The post-recording review screen (`components/gasp/ReactionPreview.tsx`) shown before the user sends or discards the reaction.
- **ReactionComposite**: The side-by-side visual component (`components/gasp/ReactionComposite.tsx`) used for preview and playback.
- **ReactionBubble**: The chat message component (`components/chat/ReactionBubble.tsx`) that represents a sent reaction in conversation.
- **Composite_Frame**: The visible side-by-side media area. Preview and chat thumbnails use the backend-aligned `1/3 reaction + 2/3 gasp` layout; full-screen playback may use a reaction-forward `45/55` visual split while keeping the same left/right semantics.
- **Panel_Label**: Small overlay label identifying each side of the composite, e.g. `You` and `{senderName}'s gasp`.
- **Playback_State**: The full-screen reaction modal opened from `ReactionBubble`.
- **Preparing_State**: The temporary chat UI shown after send while the rich composite may still be processing.
- **Dead_Space**: Any unintended empty black region inside the playback viewport caused by off-center or incorrectly sized media.
- **Watermark_Badge**: The current bottom-right logo mark rendered inside the composite.

---

## Requirements

### Requirement 1: Preserve the fixed reaction composite layout

**User Story:** As a user viewing a reaction, I want the reaction and the original gasp to appear in a predictable side-by-side format, so that I always understand what I am seeing.

#### Acceptance Criteria

1. THE ReactionComposite SHALL render the reaction video on the left and the original gasp on the right.
2. THE ReactionComposite SHALL keep the visual width ratio at `1/3 reaction` and `2/3 original gasp` by default for ReactionPreview and ReactionBubble thumbnails.
3. THE ReactionComposite SHALL fill its own visible container without unintended black Dead_Space around either panel.
4. THE ReactionComposite SHALL maintain a single vertical divider between the reaction panel and the original gasp panel.
5. THE ReactionComposite SHALL NOT introduce a `side-by-side` API layout value; the backend payload SHALL continue to use `layout: "1/3-2/3"`.
6. THE Reaction_UI_Polish SHALL NOT change recording duration, hold gesture behavior, camera permissions, upload flow, composite fallback logic, or backend FFmpeg dimensions.
7. THE Playback_State MAY override the default visual ratio to `45/55` so the reaction face remains readable in full-screen playback; this SHALL NOT change the backend composite contract.

---

### Requirement 2: Improve ReactionPreview clarity and framing

**User Story:** As a recipient reviewing my reaction, I want the preview to look intentional and readable, so that I trust what will be sent.

#### Acceptance Criteria

1. WHEN ReactionPreview is displayed, THE Composite_Frame SHALL be centered and fully visible within the screen safe area.
2. THE ReactionPreview SHALL display a title `Your Reaction` and a sender context line using the existing sender name.
3. THE ReactionPreview SHALL overlay Panel_Labels on the Composite_Frame: `You` on the reaction panel and `{senderName}'s gasp` on the original gasp panel.
4. THE ReactionPreview SHALL keep the primary Send action visually dominant and the Re-record action secondary.
5. WHILE `isSending === true`, THE Send action SHALL show a loading indicator and maintain readable text contrast.
6. THE ReactionPreview SHALL keep Discard visually available but lower emphasis than Send and Re-record.
7. THE Watermark_Badge SHALL be reduced, softened, or removed from the client-side preview if it competes with the reaction/gasp content.
8. THE reaction panel SHALL avoid accidental-looking facial crop where practical by using a consistent media fit strategy and stable panel dimensions.

---

### Requirement 3: Fix full-screen playback layout

**User Story:** As a sender opening a reaction from chat, I want the full-screen view to look like the same polished composite I saw in preview, so that playback does not feel broken.

#### Acceptance Criteria

1. WHEN a ReactionBubble is opened, THE Playback_State SHALL render the Composite_Frame centered or full-height within the viewport with no unintended Dead_Space like the upper-left black region shown in `img-logs/3.jpeg`.
2. THE Playback_State SHALL use a reaction-forward `45/55` visual split when both reaction and original media are available.
3. THE Playback_State SHALL show Panel_Labels inside the rounded media stage over a readable scrim, not in a separate large header.
4. THE close button SHALL be positioned in the safe area as a floating translucent control and SHALL NOT obscure important media content.
5. THE Playback_State SHALL NOT add play, progress, mute, share, or reply controls in this modal polish pass.
6. THE original gasp panel and reaction panel SHALL not be shifted partially outside the visible viewport.
7. THE Playback_State SHALL use a black media background only as intentional letterboxing or surrounding space, not as the dominant visible surface.
8. THE Playback_State SHALL include lightweight top context, such as `{name} reacted`, to make the top black area feel intentional without adding explanatory feature text.

---

### Requirement 4: Improve chat reaction bubble payoff

**User Story:** As a sender reading chat, I want the reaction message to look like a rich combined reaction, not a generic video placeholder.

#### Acceptance Criteria

1. THE ReactionBubble SHALL display a compact composite thumbnail instead of only a generic gradient placeholder when both reaction media and original gasp media are available.
2. THE ReactionBubble thumbnail SHALL preserve the visual `1/3 reaction + 2/3 original gasp` ratio.
3. THE ReactionBubble SHALL include a clear play affordance that does not hide the side-by-side structure.
4. THE ReactionBubble SHALL continue to display the reply reference strip when `replyToMessage` is available.
5. IF original gasp media is unavailable, THE ReactionBubble SHALL fall back to the existing generic reaction placeholder without crashing.
6. THE ReactionBubble SHALL remain compact and aligned with existing chat bubble spacing, ownership alignment, and Android JSX fragility guidance.

---

### Requirement 5: Add preparing and fallback UI states without blocking the flow

**User Story:** As a recipient who just sent a reaction, I want the app to feel responsive while the enhanced reaction is being prepared, so that I am not confused by background processing.

#### Acceptance Criteria

1. AFTER the recipient taps Send and upload succeeds, THE app SHALL navigate back without waiting for server-side composite generation, preserving the existing non-blocking flow.
2. WHILE a rich composite may still be processing, THE chat UI MAY show a Preparing_State such as `Preparing reaction` if the React Query chat cache supports an optimistic item without moving server data into a Zustand store.
3. THE Preparing_State SHALL use the same compact reaction bubble footprint as the final ReactionBubble.
4. IF composite generation fails and the raw reaction fallback is sent, THE UI SHALL still present the reaction as playable and SHALL avoid alarming modal error language.
5. THE fallback notification SHALL be non-blocking and SHOULD use toast-style feedback instead of an interruptive alert.

---

### Requirement 6: Visual quality and accessibility

**User Story:** As a user, I want reaction UI controls and labels to be readable and tappable, so that the flow feels smooth and accessible.

#### Acceptance Criteria

1. THE Panel_Labels SHALL meet readable contrast against mixed media backgrounds by using a scrim, blur, or solid translucent background.
2. THE Send, Re-record, Discard, close, and playback controls SHALL preserve accessible labels.
3. THE Send and Re-record controls SHALL maintain at least 44 px touch target height.
4. THE UI SHALL avoid text overlap on small mobile screens.
5. THE accent color SHOULD align with the app's existing visual language and SHOULD avoid making the flow purple-dominant.
6. THE Reaction_UI_Polish SHALL not add explanatory in-app text describing how the feature works.
7. ANY new user-facing string introduced by this feature SHALL be added to `locales/en.json` and referenced through the existing i18n pattern.
8. THE implementation SHOULD prefer NativeWind/Tailwind classes for layout and styling, using `StyleSheet.create` only where required for animations, complex absolute positioning, or numeric styles.
9. NO changed component file SHOULD exceed approximately 200 lines; if `ReactionBubble` or `ReactionComposite` grows beyond that, THE implementation SHALL extract small helper components or shared styles.

---

### Requirement 7: Regression coverage

**User Story:** As a developer, I want focused tests around the new UI states, so that future changes do not reintroduce the broken playback or generic chat presentation.

#### Acceptance Criteria

1. THE ReactionComposite tests SHALL verify that panel labels can be rendered, that the default reaction/gasp panels preserve the `flex: 1` and `flex: 2` layout, and that playback can override the flex values.
2. THE ReactionPreview tests SHALL verify sending/loading state contrast behavior through visible loading UI and disabled Send state.
3. THE ReactionBubble tests SHALL verify the composite thumbnail path when `replyToMessage` media exists.
4. THE ReactionBubble tests SHALL verify fallback placeholder behavior when original media is missing.
5. THE full-screen playback test SHALL verify the modal renders ReactionComposite in a full-screen container without relying on the generic placeholder.
6. Manual QA SHALL include comparing the updated UI against `img-logs/2.jpeg` and `img-logs/3.jpeg`, confirming image 2's strengths are preserved and image 3's layout defects are gone.
