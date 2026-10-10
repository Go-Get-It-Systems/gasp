import React from 'react';
import { act, render } from '@testing-library/react-native';
import { RecordingCountdown } from '@/components/gasp/RecordingCountdown';
import { heavyHaptic, mediumHaptic, successHaptic } from '@/utils/haptics';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'viewGasp.keepHolding': 'Keep holding…',
      'viewGasp.keepHoldingToOpen': 'Keep holding to open',
    }[key] ?? key),
  }),
}));

jest.mock('@/utils/haptics', () => ({
  mediumHaptic: jest.fn(),
  heavyHaptic: jest.fn(),
  successHaptic: jest.fn(),
}));

// The SVG ring is purely visual; keep it out of the render tree.
jest.mock('@/components/gasp/CountdownRing', () => ({ CountdownRing: () => null }));

const touch = { value: 200, get: () => 200, set: jest.fn() };

function renderCountdown(isActive: boolean, onCountdownComplete = jest.fn()) {
  const utils = render(
    <RecordingCountdown isActive={isActive} onCountdownComplete={onCountdownComplete}
      touchX={touch as never} touchY={touch as never} />,
  );
  return { ...utils, onCountdownComplete };
}

describe('RecordingCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while inactive', () => {
    const { toJSON } = renderCountdown(false);
    expect(toJSON()).toBeNull();
  });

  it('counts 3 → 2 → 1 with the hold label, then completes', () => {
    const { getByText, queryByText, onCountdownComplete } = renderCountdown(true);

    expect(getByText('3')).toBeTruthy();
    expect(getByText('Keep holding…')).toBeTruthy();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(getByText('2')).toBeTruthy();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(getByText('1')).toBeTruthy();
    expect(onCountdownComplete).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(onCountdownComplete).toHaveBeenCalledTimes(1);
    expect(queryByText('1')).toBeNull();
    expect(queryByText('Keep holding…')).toBeNull();
  });

  it('ramps haptics up on each tick and confirms the reveal', () => {
    renderCountdown(true);

    act(() => { jest.advanceTimersByTime(1000); });
    expect(mediumHaptic).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(1000); });
    expect(heavyHaptic).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(1000); });
    expect(successHaptic).toHaveBeenCalledTimes(1);
  });

  it('shows "Keep holding to open" when released before 0, then hides it', () => {
    const onCountdownComplete = jest.fn();
    const { rerender, getByText, queryByText, toJSON } = renderCountdown(true, onCountdownComplete);

    act(() => { jest.advanceTimersByTime(1500); });
    rerender(
      <RecordingCountdown isActive={false} onCountdownComplete={onCountdownComplete}
        touchX={touch as never} touchY={touch as never} />,
    );

    expect(getByText('Keep holding to open')).toBeTruthy();
    expect(queryByText('2')).toBeNull();

    act(() => { jest.advanceTimersByTime(5000); });
    expect(onCountdownComplete).not.toHaveBeenCalled();
    expect(toJSON()).toBeNull();
  });

  it('does not show the release hint when let go after the reveal', () => {
    const onCountdownComplete = jest.fn();
    const { rerender, queryByText } = renderCountdown(true, onCountdownComplete);

    act(() => { jest.advanceTimersByTime(3000); });
    rerender(
      <RecordingCountdown isActive={false} onCountdownComplete={onCountdownComplete}
        touchX={touch as never} touchY={touch as never} />,
    );

    expect(onCountdownComplete).toHaveBeenCalledTimes(1);
    expect(queryByText('Keep holding to open')).toBeNull();
  });
});
