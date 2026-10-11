/**
 * Dev-only trace of the core gasp flow (docs/gasp-view-contract.md).
 *
 * Each step prints one Metro line: `[gasp-flow] <step> at=<epoch ms> k=v ...`.
 * The gasp-core-e2e skill reads these lines on a physical device to check
 * timings no unit test can see (recording start vs reveal, delivery order).
 * Compiled out of release builds by the `__DEV__` check.
 */
export type FlowStep =
  | 'hold-start'
  | 'camera-ready'
  | 'recording-started'
  | 'recording-failed'
  | 'reveal'
  | 'server-open'
  | 'release'
  | 'preview'
  | 'no-clip'
  | 'clip-timeout'
  | 'upload-done'
  | 'upload-failed'
  | 'composite'
  | 'reaction-delivered'
  | 'reaction-failed'
  | 'close-view'
  | 'camera-mount-error'
  | 'video-play'
  | 'video-status';

export function traceFlow(step: FlowStep, data: Record<string, string | number | boolean | null | undefined> = {}) {
  if (!__DEV__) return;
  const fields = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  // eslint-disable-next-line no-console -- the trace is a Metro log line by design
  console.log(`[gasp-flow] ${step} at=${Date.now()}${fields ? ` ${fields}` : ''}`);
}
