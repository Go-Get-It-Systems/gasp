import React from 'react';
import { act, render } from '@testing-library/react-native';
import { RecordingHud } from '@/components/gasp/RecordingHud';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) => ({
      'viewGasp.letGoToFinish': 'Let go to finish',
      'viewGasp.recordingElapsed': `Recording, ${params?.seconds} seconds`,
    }[key] ?? key),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const shared = (v: number) => ({ value: v, get: () => v, set: jest.fn() });

describe('RecordingHud', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-10T10:00:10.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  const render_ = (props: Partial<React.ComponentProps<typeof RecordingHud>> = {}) => render(
    <RecordingHud progress={shared(0.4) as never} isRevealed={shared(1) as never}
      isHolding={shared(1) as never} isRecording recordingStartedAt={Date.now()} {...props} />,
  );

  it('shows one REC timer, the progress bar and the let-go hint while recording', () => {
    const { getByText, getByLabelText } = render_();

    expect(getByText('REC 0:00')).toBeTruthy();
    expect(getByLabelText('Recording, 0 seconds')).toBeTruthy();
    expect(getByText('Let go to finish')).toBeTruthy();
  });

  it('counts from when the recording started, which is before the reveal', () => {
    const { getByText } = render_({ recordingStartedAt: Date.now() - 3_000 });
    expect(getByText('REC 0:03')).toBeTruthy();
  });

  it('hides REC when the camera is not recording (stopped or failed)', () => {
    const { queryByText } = render_({ isRecording: false, recordingStartedAt: null });
    expect(queryByText(/^REC/)).toBeNull();
  });

  it('stops counting once recording stops, even if the finger stays down', () => {
    const startedAt = Date.now();
    const { getByText, queryByText, rerender } = render_({ recordingStartedAt: startedAt });
    act(() => { jest.advanceTimersByTime(2_000); });
    expect(getByText('REC 0:02')).toBeTruthy();

    rerender(
      <RecordingHud progress={shared(1) as never} isRevealed={shared(1) as never}
        isHolding={shared(1) as never} isRecording={false} recordingStartedAt={null} />,
    );
    act(() => { jest.advanceTimersByTime(5_000); });
    expect(queryByText(/^REC/)).toBeNull();
  });
});
