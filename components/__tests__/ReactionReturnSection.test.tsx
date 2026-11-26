import { fireEvent, render } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';
import { ReactionReturnSection } from '@/components/inbox/ReactionReturnSection';
import type { ReactionReturn } from '@/services/api/schemas/gasp.schema';

jest.mock('@/components/inbox/ReactionReturnItem', () => ({
  ReactionReturnItem: ({ reaction }: { reaction: ReactionReturn }) => <MockText>{reaction.id}</MockText>,
}));
jest.mock('@/components/ui/Skeleton', () => ({ Skeleton: 'Skeleton' }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const copy: Record<string, string> = {
        'gasps.pulse.reactionsForYou': 'REACTIONS FOR YOU',
        'gasps.pulse.showAllReactions': `View all ${params?.count} reactions`,
        'gasps.pulse.showFewerReactions': 'Show fewer',
        'gasps.pulse.loadMore': 'Load more reactions',
      };
      return copy[key] ?? key;
    },
  }),
}));

const createReaction = (index: number): ReactionReturn => ({
  id: `reaction-${index}`,
  gaspId: `gasp-${index}`,
  reactor: {
    id: `friend-${index}`,
    displayName: `Friend ${index}`,
    username: `friend${index}`,
    avatarUrl: null,
  },
  reactionMediaUrl: `https://example.com/reaction-${index}.mp4`,
  originalMediaMetadata: {
    imageUrl: `https://example.com/gasp-${index}.jpg`,
    mediaType: 'image',
  },
  capturedAt: '2026-08-27T00:00:00.000Z',
  conversationId: null,
  messageId: null,
});

describe('ReactionReturnSection', () => {
  it('shows four reactions first and lets the user expand and collapse the history', () => {
    const reactions = Array.from({ length: 13 }, (_, index) => createReaction(index + 1));
    const screen = render(
      <ReactionReturnSection
        reactions={reactions}
        isLoading={false}
        isError={false}
        hasMore={false}
        isLoadingMore={false}
        onRetry={jest.fn()}
        onLoadMore={jest.fn()}
      />,
    );

    expect(screen.getByText('reaction-4')).toBeTruthy();
    expect(screen.queryByText('reaction-5')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'View all 13 reactions' }));
    expect(screen.getByText('reaction-13')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('reaction-5')).toBeNull();
  });

  it('keeps server pagination available when the current page has no hidden items', () => {
    const onLoadMore = jest.fn();
    const screen = render(
      <ReactionReturnSection
        reactions={[createReaction(1), createReaction(2)]}
        isLoading={false}
        isError={false}
        hasMore
        isLoadingMore={false}
        onRetry={jest.fn()}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Load more reactions' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('exposes server pagination after expanding hidden reactions and hides it when collapsed', () => {
    const onLoadMore = jest.fn();
    const screen = render(
      <ReactionReturnSection
        reactions={Array.from({ length: 6 }, (_, index) => createReaction(index + 1))}
        isLoading={false}
        isError={false}
        hasMore
        isLoadingMore={false}
        onRetry={jest.fn()}
        onLoadMore={onLoadMore}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Load more reactions' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'View all 6 reactions' }));
    fireEvent.press(screen.getByRole('button', { name: 'Load more reactions' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByRole('button', { name: 'Load more reactions' })).toBeNull();
  });

  it('disables server pagination while another page is loading', () => {
    const onLoadMore = jest.fn();
    const screen = render(
      <ReactionReturnSection
        reactions={[createReaction(1)]}
        isLoading={false}
        isError={false}
        hasMore
        isLoadingMore
        onRetry={jest.fn()}
        onLoadMore={onLoadMore}
      />,
    );

    const button = screen.getByRole('button', { name: 'Load more reactions' });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
