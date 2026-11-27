# Business likes visual proposal

Standalone browser proposal; no native app or API implementation. Main, the compiled beta and published media are unchanged.

## Approved media direction

Use the useful source image at full container width, with height following its aspect ratio. No generated blur or padding. Do not stretch or crop meaningful content to force a uniform height. Existing published assets contain baked-in blur and require a separate source-based preparation step before adopting this presentation.

The Adidas sample is 12 seconds, 720×540, with its original audio. Only source black sidebars were removed. The optional 360×640 portrait sample is a clearly labelled synthetic framing fixture with a quiet test tone, not a brand campaign.

## Interaction proposal

A 20px muted outline heart sits below the video, in a right-aligned group with the count. Selected state is purple. Touch target remains at least 48px. Likes are simulated; failed updates restore the previous state and offer retry. Changing samples resets the simulated state and pauses playback.

## Browser validation — 27 November 2026

- Landscape rendered at 388×291; portrait at 388×689.77, preserving both aspect ratios.
- At a 390px browser viewport, no horizontal overflow; the portrait heart remains reachable by scrolling and has a 48px target.
- Like, failed unlike rollback, and successful retry checked interactively.
- Screenshots inspected for landscape, portrait and narrow viewport.

Physical iPhone validation and native integration remain pending. Browser viewport checks are not native-device tests. Personal reaction composition is outside this proposal.
