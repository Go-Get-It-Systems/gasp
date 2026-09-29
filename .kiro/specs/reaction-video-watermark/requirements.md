# Reaction Video `G!` Watermark — Requirements

**Status:** Follow-up required — chat thumbnail watermark missing in device QA  
**Owner:** Product / Gasp  
**Related backlog item:** F1 — Reaction superimposed on original media  
**Decision date:** 23 July 2026

## Summary

Add a small, persistent Gasp `G!` logo watermark to the bottom-right of the
**original Gasp panel** in a finished reaction composite. The mark attributes
the shared reaction to Gasp without interrupting the reaction itself.

This decision replaces the earlier F1 product decision to remove the
watermark.

## Product decision

- The watermark is the **`G!` glyph only**.
- It is white, semi-transparent, and has a transparent background.
- It belongs in the lower-right corner of the **right/original Gasp panel**.
- It is baked into every generated composite video, so it survives saving and
  sharing outside Gasp.
- The app previews the same placement wherever the full composite is shown.

## Device QA observation — `img-logs/30.png`

The chat reaction card renders the reaction and original Gasp side by side,
but no `G!` is visible in the lower-right of the original panel. Opening the
same reaction shows the watermark correctly in full-screen playback.

This is a client-thumbnail parity issue, not a backend export issue.

## In scope

1. Full-screen composite preview after a reaction is recorded.
2. Full-screen playback of a reaction composite in chat.
3. The server-generated composite MP4 that is saved or shared.
4. Photo and video originals, in portrait, landscape, and square source media.

## Out of scope

- `Made with Gasp` copy, chips, end cards, or intro cards.
- The coloured rounded-square app icon as a playback watermark.
- Watermarks on raw original gasps or raw reaction recordings.
- A user setting, paid removal option, repositioning control, or animation.
- Any layout, playback, recording, upload, or sharing changes beyond rendering
  the mark in the completed composite.

## Functional requirements

### R1 — Correct asset

The system SHALL use a production-owned `G!` glyph asset with a transparent
background. The glyph SHALL be white and SHALL NOT include the coloured
blue/purple/pink rounded-square app-icon background.

### R2 — Correct location

When a composite is rendered, the system SHALL place the watermark inside the
bottom-right of the original Gasp panel (the right panel in the 1/3–2/3
layout), not over the reaction panel and not relative to the device screen.

### R3 — Visual treatment

The watermark SHALL be small and secondary to the video: approximately 6% of
the 1080px composite width (64px in the current 1080×1920 output), at 70%
opacity. It SHALL have a subtle dark shadow or outline sufficient to remain
legible over bright footage, without a pill, tile, or opaque backing.

### R4 — Safe spacing

For the current 1080×1920 export, the system SHALL inset the watermark 24px
from the right edge and 36px from the bottom edge of the composite. Equivalent
proportional safe spacing SHALL be used in the in-app preview.

### R5 — Persistent attribution

When the backend creates a composite MP4, it SHALL burn the watermark into the
encoded pixels for the full duration of the output. It SHALL be visible after
the file is saved to Photos or shared to another platform.

### R6 — Preview parity

When a user sees a full-size reaction composite in the app, the app SHALL show
the same `G!` mark, position, and visual weight as the exported composite.
The mark SHALL remain visible for the whole preview/playback duration.

### R7 — Media compatibility

The system SHALL apply the mark to composites whose original Gasp is an image
or video, irrespective of the source aspect ratio. The established 1/3–2/3
composition and media fitting behaviour SHALL remain unchanged.

### R8 — No additional brand copy

The system SHALL NOT show “Made with Gasp”, the Gasp wordmark, an end slate,
or additional branding as part of this feature.

### R9 — Failure behaviour

The backend SHALL NOT return an unwatermarked composite as a successful
result. If the watermark asset cannot be read or the FFmpeg watermark step
fails, the composition job SHALL fail through the existing composite failure
path and be observable in error monitoring.

### R10 — Accessibility and interaction

The watermark SHALL be decorative: it SHALL not intercept taps, change the
accessible controls, alter playback, or block the existing close/share actions.

## Acceptance scenarios

### Scenario 1 — Photo original

**Given** a reaction to a photo Gasp  
**When** the composite is previewed, generated, and saved  
**Then** the same small white `G!` appears in the lower-right of the original
right panel in the preview and in the saved MP4.

### Scenario 2 — Video original

**Given** a reaction to a video Gasp  
**When** the video composite plays  
**Then** the watermark remains visible in the defined position for the entire
output duration and does not affect the reaction audio or video playback.

### Scenario 3 — Bright source media

**Given** a bright or mostly white original Gasp  
**When** the composite is rendered  
**Then** the `G!` remains readable because of its specified subtle dark edge,
without using an opaque box behind it.

### Scenario 4 — External sharing

**Given** a completed composite is sent to Photos, Messages, Instagram, or
another application  
**When** it is viewed outside Gasp  
**Then** it still contains only the small `G!` watermark; no “Made with Gasp”
text or end card is present.

### Scenario 5 — Compact thumbnail

**Given** a reaction appears as a compact chat thumbnail  
**When** the thumbnail is rendered from the two source assets before the
server composite is available  
**Then** the same small `G!` must appear in the lower-right of the original
panel. The thumbnail must not add another client watermark when its media is
already a server-generated composite containing the baked mark.

### Scenario 6 — Rendering failure

**Given** the server cannot load the watermark asset or FFmpeg cannot apply it  
**When** composite generation runs  
**Then** the request fails using the existing `COMPOSITE_FAILED` behaviour and
does not upload or return an unbranded composite.
