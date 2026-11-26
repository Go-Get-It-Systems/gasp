import { fireEvent, render } from '@testing-library/react-native';
import { LatestMomentCard } from '@/components/inbox/LatestMomentCard';
import { OpenNowItem } from '@/components/inbox/OpenNowItem';
import { OpenNowRail } from '@/components/inbox/OpenNowRail';
import type { Gasp, LatestMoment } from '@/services/api/schemas/gasp.schema';

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/components/inbox/CountdownRing', () => ({ CountdownRing: ({ children }: { children: unknown }) => children }));
jest.mock('@/components/ui/Avatar', () => ({ Avatar: 'Avatar' }));
jest.mock('@/components/ui/Skeleton', () => ({ Skeleton: 'Skeleton' }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const copy: Record<string, string> = {
        'gasps.pulse.openFrom': `Open Gasp from ${params?.name}`,
        'gasps.pulse.tapToOpen': 'Tap to open',
        'gasps.pulse.expiresInHours': `Expires in ${params?.count} hours`,
        'gasps.pulse.latestMoment': 'Your latest moment',
        'gasps.pulse.momentError': 'Could not load your latest moment',
        'gasps.pulse.momentAccessibility': `${params?.recipients} recipients, ${params?.opened} opened, ${params?.reactions} reactions`,
        'gasps.pulse.sentTo': `Sent to ${params?.count}`,
        'gasps.pulse.opened': `${params?.count} opened`,
        'gasps.pulse.reactionCount': `${params?.count} reactions`,
        'gasps.pulse.expired': 'Expired',
        'common.tryAgain': 'Try again',
      };
      return copy[key] ?? key;
    },
  }),
}));

const longName = 'Alexandria Catherine Montgomery-Wellington the Third';
const gasp: Gasp = {
  id: 'gasp-1',
  senderId: 'sender-1',
  senderName: longName,
  senderAvatarUrl: null,
  imageUrl: 'https://storage.googleapis.com/gasp-cab37/private.jpg',
  imageUri: 'https://storage.googleapis.com/gasp-cab37/private.jpg',
  mediaType: 'image',
  blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
  replayable: false,
  status: 'pending',
  deliveryStatus: 'sent',
  createdAt: '2026-08-27T00:00:00.000Z',
  expiresAt: '2099-08-28T00:00:00.000Z',
};

const moment: LatestMoment = {
  id: 'moment-1',
  recipientCount: 12,
  deliveredCount: 12,
  openedCount: 7,
  reactionCount: 3,
  isExpired: false,
  expiresAt: '2099-08-28T00:00:00.000Z',
  identitySummaries: [{ id: 'friend-1', displayName: longName, username: 'alexandria', avatarUrl: null }],
  mediaMetadata: {
    imageUrl: 'https://storage.googleapis.com/gasp-cab37/private.jpg',
    mediaType: 'image',
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    textOverlay: null,
    replayable: false,
  },
};

describe('Gasps Social Pulse components', () => {
  const railProps = {
    isLoading: false,
    isError: false,
    loadingId: null,
    onCapture: jest.fn(),
    onRetry: jest.fn(),
  };

  it('stretches a single featured card and keeps its media private before opening', () => {
    const onOpen = jest.fn();
    const screen = render(<OpenNowRail {...railProps} gasps={[gasp]} onOpen={onOpen} />);
    const card = screen.getByRole('button', { name: `Open Gasp from ${longName}` });

    expect(card).toHaveStyle({ alignSelf: 'stretch', marginHorizontal: 20 });
    expect(JSON.stringify(screen.toJSON())).not.toContain(gasp.imageUrl);
    fireEvent.press(card);
    expect(onOpen).toHaveBeenCalledWith(gasp);
  });

  it('keeps multiple cards compact and opens the selected sender', () => {
    const secondGasp = { ...gasp, id: 'gasp-2', senderName: 'Bi' };
    const onOpen = jest.fn();
    const screen = render(<OpenNowRail {...railProps} gasps={[gasp, secondGasp]} onOpen={onOpen} />);
    const secondCard = screen.getByRole('button', { name: 'Open Gasp from Bi' });

    expect(secondCard).toHaveStyle({ width: 154 });
    fireEvent.press(secondCard);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(secondGasp);
  });

  it('prevents opening the featured card again while it is loading', () => {
    const onOpen = jest.fn();
    const screen = render(<OpenNowRail {...railProps} gasps={[gasp]} loadingId={gasp.id} onOpen={onOpen} />);
    const card = screen.getByRole('button', { name: `Open Gasp from ${longName}` });

    expect(card).toBeDisabled();
    fireEvent.press(card);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('keeps a long sender name accessible and opens only the pressed Gasp', () => {
    const onPress = jest.fn();
    const screen = render(<OpenNowItem gasp={gasp} isLoading={false} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: `Open Gasp from ${longName}` }));

    expect(screen.getByText(longName).props.numberOfLines).toBe(1);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(gasp);
  });

  it('announces plural Moment outcomes without rendering a dead button', () => {
    const screen = render(<LatestMomentCard moment={moment} isLoading={false} isError={false} onRetry={jest.fn()} />);

    expect(screen.getByLabelText('12 recipients, 7 opened, 3 reactions')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('omits the empty Moment section and exposes retry only for errors', () => {
    const onRetry = jest.fn();
    const empty = render(<LatestMomentCard moment={null} isLoading={false} isError={false} onRetry={onRetry} />);
    expect(empty.toJSON()).toBeNull();

    const failed = render(<LatestMomentCard moment={null} isLoading={false} isError onRetry={onRetry} />);
    fireEvent.press(failed.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
