import React from 'react';
import { render } from '@testing-library/react-native';
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
  it('shows one REC timer, the progress bar and the let-go hint', () => {
    const { getByText, getByLabelText } = render(
      <RecordingHud progress={shared(0.4) as never} isRevealed={shared(1) as never}
        isHolding={shared(1) as never} />,
    );

    expect(getByText('REC 0:00')).toBeTruthy();
    expect(getByLabelText('Recording, 0 seconds')).toBeTruthy();
    expect(getByText('Let go to finish')).toBeTruthy();
  });
});
