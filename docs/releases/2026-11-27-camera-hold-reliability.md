# Camera hold reliability

The owner reported ignored recording holds and clips ending while the finger remained inside the capture circle. The installed iOS long-press recognizer defaults to 10 points of movement tolerance; CaptureButton did not override it and attached its gestures to a shrinking animated visual.

## Change

- Attach gestures to the stable 88-point wrapper covering the visible capture ring, with decorative descendants excluded from touch input.
- Allow movement up to the ring diameter and disable cancellation merely from crossing its boundary. Large movement beyond this tolerance can still cancel; release and system cancellation continue to stop an active hold.
- Capture photos only when the tap recognizer reports success, never on a cancelled tap.
- Preserve the hold threshold, camera-mode setup delay, recording duration limit, media processing and backend behavior.

## Validation

- 623 tests across 98 suites passed on this main-based branch, including five new CaptureButton cases and existing camera flow coverage.
- TypeScript, targeted ESLint and diff checks passed.
- New tests use actual gesture builders with a mocked native host: stable target bounds through recording, movement configuration, successful versus cancelled taps, and release/cancellation callbacks. They do not simulate the physical iOS finger recognizer or prove camera capture on hardware.
- Updated the shared development preview with this component, preserving the already-tested Business navigation correction. All three clients (two simulators and physical iPhone) were confirmed attached to that server against the beta-content API. The phone was relaunched successfully. Camera screen and capture control were visible in the simulator.
- Physical validation: after being asked to hold around five seconds, move the finger slightly inside the circle and release, the owner reported that the test worked on the connected iPhone. The reported hold sensitivity scenario is approved. An ordinary photo tap, quick release before recording starts and the ten-second cap were not separately confirmed on hardware in this round; automated camera flow coverage remains recorded above.

## Release

Separate work branch based on main. Include this reviewed fix with Business likes and guidance navigation in the next beta change set. No main merge, official build, API deployment, Apple submission or tester distribution is part of this change.
