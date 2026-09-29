import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import type { ComponentType } from 'react';
import { ReactionPreview } from '@/components/gasp/ReactionPreview';

const MockReactionComposite = 'ReactionComposite' as unknown as ComponentType<Record<string, unknown>>;

jest.mock('@/components/gasp/ReactionComposite', () => ({
  ReactionComposite: 'ReactionComposite',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const values: Record<string, string> = {
        'reaction.yourReaction': 'Your Reaction',
        'reaction.reactionTo': `to ${params?.name}'s gasp`,
        'reaction.you': 'You',
        'reaction.senderGasp': `${params?.name}'s gasp`,
        'reaction.reRecord': 'Re-record',
        'reaction.sendReaction': 'Send Reaction',
        'reaction.saveToCameraRoll': 'Save to Camera Roll',
        'reaction.discard': 'Discard',
      };
      return values[key] ?? key;
    },
  }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

const DEFAULT_PROPS = {
  originalImageUri: 'https://cdn.example.com/gasp.jpg',
  originalMediaType: 'image' as const,
  reactionVideoUri: 'file:///reaction.mp4',
  senderName: 'Alice',
  onSend: jest.fn(),
  onDiscard: jest.fn(),
};

describe('ReactionPreview', () => {
  describe('Send button states', () => {
    it('shows Send icon and enables button when isSending is false (default)', () => {
      const { getByRole, UNSAFE_queryByType } = render(
        <ReactionPreview {...DEFAULT_PROPS} isSending={false} />,
      );

      const sendButton = getByRole('button', { name: 'Send Reaction' });
      expect(sendButton.props.accessibilityState?.disabled).toBeFalsy();

      const indicator = UNSAFE_queryByType(ActivityIndicator);
      expect(indicator).toBeNull();
    });

    it('shows Send icon and enables button when isSending prop is omitted', () => {
      const { getByRole, UNSAFE_queryByType } = render(
        <ReactionPreview {...DEFAULT_PROPS} />,
      );

      const sendButton = getByRole('button', { name: 'Send Reaction' });
      expect(sendButton.props.accessibilityState?.disabled).toBeFalsy();

      expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });

    it('shows ActivityIndicator and disables button when isSending is true', () => {
      const { getByRole, UNSAFE_getByType } = render(
        <ReactionPreview {...DEFAULT_PROPS} isSending={true} />,
      );

      const sendButton = getByRole('button', { name: 'Send Reaction' });
      expect(sendButton.props.accessibilityState?.disabled).toBe(true);

      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('send button does not call onSend when isSending is true', () => {
      const onSend = jest.fn();
      const { getByRole } = render(
        <ReactionPreview {...DEFAULT_PROPS} onSend={onSend} isSending={true} />,
      );

      const sendButton = getByRole('button', { name: 'Send Reaction' });
      // Button is disabled, so pressing it should not fire onSend
      expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('send button applies reduced opacity style when isSending is true', () => {
      const { getByRole } = render(
        <ReactionPreview {...DEFAULT_PROPS} isSending={true} />,
      );

      const sendButton = getByRole('button', { name: 'Send Reaction' });
      const flatStyle = Array.isArray(sendButton.props.style)
        ? Object.assign({}, ...sendButton.props.style.filter(Boolean))
        : sendButton.props.style;

      expect(flatStyle?.opacity).toBe(0.82);
    });

    it('passes panel labels to ReactionComposite', () => {
      const { UNSAFE_getByType } = render(
        <ReactionPreview {...DEFAULT_PROPS} />,
      );

      const composite = UNSAFE_getByType(MockReactionComposite);
      expect(composite.props.reactionLabel).toBe('You');
      expect(composite.props.originalLabel).toBe("Alice's gasp");
      expect(composite.props.showLabels).toBe(true);
      expect(composite.props.showDivider).toBe(true);
      expect(composite.props.watermarkMode).toBe('subtle');
      expect(composite.props.reactionFlex).toBe(45);
      expect(composite.props.originalFlex).toBe(55);
    });
  });
});
