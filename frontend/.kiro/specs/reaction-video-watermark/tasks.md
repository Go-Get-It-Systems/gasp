# Reaction Video `G!` Watermark — Tasks

**Status:** Follow-up required after device QA — chat thumbnail watermark is
currently hidden.

## 1. Brand asset preparation

- [x] Export the approved `G!` glyph from the supplied Gasp logo as a
  transparent-background master PNG (minimum 256×256).
- [x] Confirm it has no coloured rounded-square background, wordmark, or
  “Made with Gasp” copy.
- [x] Add separate app and backend runtime copies from the approved source,
  following the repositories’ asset conventions.

## 2. Client rendering

- [x] Replace the current placeholder watermark view in `ReactionComposite`
  with the approved glyph image.
- [x] Move/anchor the overlay within the original/right panel and apply the
  specified size, opacity, and non-interactive behaviour.
- [x] Enable the watermark in `ReactionPreview`.
- [x] Enable the watermark in `ReactionPlaybackModal`.
- [ ] Change source-composed `ReactionThumbnail` from `watermarkMode="hidden"`
  to `watermarkMode="subtle"`.
- [ ] Add a thumbnail-level test confirming the `G!` is requested for the
  source-composed chat preview without duplicating it on baked composites.

## 3. Server rendering

- [x] Make the approved watermark asset available in the backend production
  container.
- [x] Extend the FFmpeg composition pipeline with the required third input and
  overlay stage.
- [x] Maintain 1080×1920 output, the existing 1/3–2/3 panel allocation,
  reaction audio, source-media handling, and upload path.
- [x] Make missing assets and overlay failures return the existing
  `COMPOSITE_FAILED` result; do not upload an unwatermarked fallback.

## 4. Automated validation

- [x] Update `ReactionComposite` tests to assert that the subtle glyph is
  rendered in the original panel only and omitted when `hidden`.
- [x] Update preview/playback tests to assert the full-size surfaces request
  subtle watermark mode.
- [x] Update composite-service FFmpeg argument tests to assert a watermark
  input and overlay filter; remove the obsolete assertion that the watermark
  is absent.
- [x] Add failure coverage for a missing watermark asset / overlay failure.

## 5. Device and export QA

- [ ] Verify a photo-original composite on iOS.
- [ ] Verify a video-original composite on iOS.
- [ ] Verify bright and dark original media, including a waterfall/sky style
  clip, for legibility without a visible badge.
- [ ] Save the generated MP4 to Photos and share it to at least one external
  app; confirm the `G!` is baked into the file.
- [ ] Compare the full-size app preview against the saved MP4 for placement
  and visual weight.
- [ ] Confirm no “Made with Gasp” text, app-icon tile, or end card appears.

## Definition of done

The task is complete only when every acceptance scenario in
[`requirements.md`](requirements.md) passes, the visual treatment matches the
approved mockup direction, and no unwatermarked composite can be produced by
the server.
