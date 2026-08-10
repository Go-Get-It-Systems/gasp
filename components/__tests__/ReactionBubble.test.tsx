import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { ComponentType } from 'react';
import { ReactionBubble } from '@/components/chat/ReactionBubble';
import type { Message } from '@/services/api/schemas/chat.schema';

const MockReactionComposite = 'ReactionComposite' as unknown as ComponentType<Record<string, unknown>>;
const MockInlineVideo = 'InlineVideo' as unknown as ComponentType<Record<string, unknown>>;

jest.mock('@/components/gasp/ReactionComposite', () => ({
  ReactionComposite: 'ReactionComposite',
}));

jest.mock('@/components/ui/InlineVideo', () => ({
  InlineVideo: 'InlineVideo',
}));

jest.mock('expo-image', () => ({
  Image: 'ExpoImage',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/mediaCache', () => ({
  getCachedUri: jest.fn(() => null),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const values: Record<string, string> = {
        'reaction.reactionVideoTap': 'Reaction video, tap to view composite',
        'reaction.closeReactionView': 'Close reaction view',
        'reaction.you': 'You',
        'reaction.reaction': 'Reaction',
        'reaction.reactedBy': `${params?.name} reacted`,
        'reaction.reactionOnly': `${params?.name}'s reaction`,
        'reaction.senderGasp': `${params?.name}'s gasp`,
        'reaction.yourReaction': 'Your Reaction',
        'reaction.yourGasp': 'Your gasp',
        'reaction.gasp': 'Gasp',
        'reaction.playReaction': 'Play reaction',
        'reaction.pauseReaction': 'Pause reaction',
        'reaction.muteReaction': 'Mute reaction',
        'reaction.unmuteReaction': 'Unmute reaction',
      };
      return values[key] ?? key;
    },
  }),
}));

const reactionMessage: Message = {
  id: 'reaction-1',
  conversationId: 'conversation-1',
  senderId: 'user-1',
  content: '[Reaction]',
  type: 'reaction',
  createdAt: '2026-07-10T00:00:00.000Z',
  mediaUrl: 'https://cdn.example.com/reaction.mp4',
  replyToId: 'gasp-1',
};

const gaspMessage: Message = {
  id: 'gasp-1',
  conversationId: 'conversation-1',
  senderId: 'user-2',
  content: 'https://cdn.example.com/gasp.jpg',
  type: 'gasp',
  createdAt: '2026-07-10T00:00:00.000Z',
  mediaUrl: 'https://cdn.example.com/gasp.jpg',
};

describe('ReactionBubble', () => {
  it('renders a composite thumbnail when original media exists', () => {
    const { getByTestId, queryByLabelText, UNSAFE_getAllByType } = render(
      <ReactionBubble
        message={reactionMessage}
        isOwnMessage={false}
        replyToMessage={gaspMessage}
        otherParticipantName="Alice"
      />,
    );

    const composites = UNSAFE_getAllByType(MockReactionComposite);
    expect(composites[0].props.originalUri).toBe('https://cdn.example.com/gasp.jpg');
    expect(composites[0].props.reactionVideoUri).toBe('https://cdn.example.com/reaction.mp4');
    expect(composites[0].props.showDivider).toBe(true);
    expect(composites[0].props.reactionPaused).toBe(true);
    expect(composites[0].props.reactionMuted).toBe(true);
    expect(composites[0].props.reactionFlex).toBe(45);
    expect(composites[0].props.originalFlex).toBe(55);
    expect(getByTestId('reaction-thumbnail-frame')).toBeTruthy();
    expect(queryByLabelText('Close reaction view')).toBeNull();
  });

  it('falls back to placeholder when original media is missing', () => {
    const { UNSAFE_queryByType } = render(
      <ReactionBubble
        message={reactionMessage}
        isOwnMessage={false}
        replyToMessage={null}
      />,
    );

    expect(UNSAFE_queryByType(MockReactionComposite)).toBeNull();
  });

  it('opens raw reaction video when original media is missing', () => {
    const { getByRole, getByText, UNSAFE_getByType } = render(
      <ReactionBubble
        message={reactionMessage}
        isOwnMessage={false}
        replyToMessage={null}
        otherParticipantName="Bi"
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Reaction video, tap to view composite' }));

    const rawVideo = UNSAFE_getByType(MockInlineVideo);
    expect(rawVideo.props.uri).toBe('https://cdn.example.com/reaction.mp4');
    expect(rawVideo.props.muted).toBe(false);
    expect(getByText("Bi's reaction")).toBeTruthy();
  });

  it('does not treat backend composite media as a raw reaction panel', () => {
    const compositeMessage: Message = {
      ...reactionMessage,
      mediaUrl: 'https://storage.googleapis.com/app/composites/user/out.mp4',
    };
    const { getByRole, getByText, UNSAFE_queryByType, UNSAFE_getByType } = render(
      <ReactionBubble
        message={compositeMessage}
        isOwnMessage
        replyToMessage={gaspMessage}
        otherParticipantName="Alice"
      />,
    );

    expect(UNSAFE_queryByType(MockReactionComposite)).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Reaction video, tap to view composite' }));

    const rawVideo = UNSAFE_getByType(MockInlineVideo);
    expect(rawVideo.props.uri).toBe('https://storage.googleapis.com/app/composites/user/out.mp4');
    expect(getByText('Your Reaction')).toBeTruthy();
  });

  it('opens and closes the full-screen composite modal', () => {
    const {
      getByRole, getByLabelText, getByText, getAllByText,
      getByTestId, UNSAFE_getAllByType, queryByLabelText,
    } = render(
      <ReactionBubble
        message={reactionMessage}
        isOwnMessage
        replyToMessage={gaspMessage}
        otherParticipantName="Alice"
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Reaction video, tap to view composite' }));

    const composites = UNSAFE_getAllByType(MockReactionComposite);
    expect(composites.length).toBeGreaterThanOrEqual(2);
    expect(composites[1].props.showDivider).toBe(true);
    expect(composites[1].props.watermarkMode).toBe('subtle');
    expect(composites[1].props.showLabels).toBeUndefined();
    expect(composites[1].props.reactionFlex).toBe(45);
    expect(composites[1].props.originalFlex).toBe(55);
    expect(getByText('You')).toBeTruthy();
    expect(getByText('You reacted')).toBeTruthy();
    expect(getAllByText("Alice's gasp")).toHaveLength(2);
    expect(getByLabelText('Close reaction view')).toBeTruthy();

    const modalStyle = StyleSheet.flatten(getByTestId('reaction-playback-modal').props.style) as ViewStyle;
    const frameStyle = StyleSheet.flatten(getByTestId('reaction-playback-frame').props.style) as ViewStyle;
    const topContextStyle = StyleSheet.flatten(getByTestId('reaction-playback-top-context').props.style) as ViewStyle;
    expect(modalStyle).toMatchObject({
      flex: 1,
      backgroundColor: '#000',
    });
    expect(topContextStyle).toMatchObject({
      width: '94%',
    });
    expect(frameStyle).toMatchObject({
      width: '94%',
      maxHeight: '82%',
      borderRadius: 22,
    });
    fireEvent.press(getByLabelText('Close reaction view'));
    expect(queryByLabelText('Close reaction view')).toBeNull();
  });

  it('renders received reactions for the original sender like the polished composite playback', () => {
    const { getByRole, getAllByText, getByText, UNSAFE_getAllByType } = render(
      <ReactionBubble
        message={reactionMessage}
        isOwnMessage={false}
        replyToMessage={gaspMessage}
        otherParticipantName="Bi"
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Reaction video, tap to view composite' }));

    const composites = UNSAFE_getAllByType(MockReactionComposite);
    expect(composites.length).toBeGreaterThanOrEqual(2);
    expect(composites[1].props.reactionVideoUri).toBe('https://cdn.example.com/reaction.mp4');
    expect(composites[1].props.originalUri).toBe('https://cdn.example.com/gasp.jpg');
    expect(composites[1].props.reactionFlex).toBe(45);
    expect(composites[1].props.originalFlex).toBe(55);
    expect(getByText('Bi')).toBeTruthy();
    expect(getByText('Bi reacted')).toBeTruthy();
    expect(getAllByText('Your gasp')).toHaveLength(2);
  });
});
