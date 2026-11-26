const { traceFlow } = jest.requireActual<typeof import('@/services/flowTrace')>('@/services/flowTrace');

describe('traceFlow', () => {
  const globals = global as unknown as { __DEV__: boolean };
  const originalDev = globals.__DEV__;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000 });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    globals.__DEV__ = originalDev;
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it('prints the line format the gasp-core-e2e skill parses', () => {
    globals.__DEV__ = true;
    traceFlow('composite', { revealOffsetMs: 3012, isComposite: true, skipped: undefined });

    expect(logSpy).toHaveBeenCalledWith('[gasp-flow] composite at=1000 revealOffsetMs=3012 isComposite=true');
  });

  it('prints nothing in release builds', () => {
    globals.__DEV__ = false;
    traceFlow('reveal');

    expect(logSpy).not.toHaveBeenCalled();
  });
});
