import React from 'react';
import { render } from '@testing-library/react-native';
import { HoldIntro } from '@/components/gasp/HoldIntro';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => ({
      'viewGasp.sentYouAGasp': `${params?.name} sent you a gasp`,
      'viewGasp.photo': 'Photo',
      'viewGasp.video': 'Video',
      'viewGasp.pressAndHold': 'Press & hold to open',
      'viewGasp.recordingHint': 'Your reaction is recorded while you hold',
    }[key] ?? key),
  }),
}));

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const shared = (v: number) => ({ value: v, get: () => v, set: jest.fn() });

function renderIntro(props: Partial<React.ComponentProps<typeof HoldIntro>> = {}) {
  return render(
    <HoldIntro senderName="Alex" mediaType="image" durationS={10}
      isHolding={shared(0) as never} isRevealed={shared(0) as never} {...props} />,
  );
}

describe('HoldIntro', () => {
  it('says who sent the gasp, what it is and how to open it', () => {
    const { getByText } = renderIntro();

    expect(getByText('Alex sent you a gasp')).toBeTruthy();
    expect(getByText('Photo · 10s')).toBeTruthy();
    expect(getByText('Press & hold to open')).toBeTruthy();
    expect(getByText('Your reaction is recorded while you hold')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
  });

  it('shows only the type while a video duration is still loading', () => {
    const { getByText, queryByText } = renderIntro({ mediaType: 'video', durationS: null });

    expect(getByText('Video')).toBeTruthy();
    expect(queryByText(/·/)).toBeNull();
  });
});
