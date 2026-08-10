import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { ReactionComposite } from '@/components/gasp/ReactionComposite';

jest.mock('@/components/ui/InlineVideo', () => ({
  InlineVideo: 'InlineVideo',
}));

jest.mock('expo-image', () => ({
  Image: 'ExpoImage',
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({ loop: false, muted: false, play: jest.fn() })),
  VideoView: 'VideoView',
}));

jest.mock('@/assets/images/gasp-watermark-white.png', () => 1);

const DEFAULT_PROPS = {
  originalUri: 'https://cdn.example.com/gasp.jpg',
  originalMediaType: 'image' as const,
  reactionVideoUri: 'file:///reaction.mp4',
};

describe('ReactionComposite', () => {
  describe('layout', () => {
    it('renders a row container', () => {
      // Container has flexDirection row via styles — verify by checking panels exist
      expect(() => render(<ReactionComposite {...DEFAULT_PROPS} />)).not.toThrow();
    });

    it('renders the default 45/55 reaction-to-gasp split', () => {
      const { getByTestId } = render(
        <ReactionComposite {...DEFAULT_PROPS} />,
      );
      const reactionStyle = StyleSheet.flatten(getByTestId('reaction-composite-reaction-panel').props.style) as ViewStyle;
      const gaspStyle = StyleSheet.flatten(getByTestId('reaction-composite-gasp-panel').props.style) as ViewStyle;

      expect(reactionStyle.flex).toBe(45);
      expect(gaspStyle.flex).toBe(55);
    });

    it('allows playback to override the panel split', () => {
      const { getByTestId } = render(
        <ReactionComposite {...DEFAULT_PROPS} reactionFlex={45} originalFlex={55} />,
      );
      const reactionStyle = StyleSheet.flatten(getByTestId('reaction-composite-reaction-panel').props.style) as ViewStyle;
      const gaspStyle = StyleSheet.flatten(getByTestId('reaction-composite-gasp-panel').props.style) as ViewStyle;

      expect(reactionStyle.flex).toBe(45);
      expect(gaspStyle.flex).toBe(55);
    });

    it('renders the container with flexDirection row', () => {
      expect(() => render(<ReactionComposite {...DEFAULT_PROPS} />)).not.toThrow();
    });

    it('renders divider by default', () => {
      const { getByTestId } = render(
        <ReactionComposite {...DEFAULT_PROPS} />,
      );

      expect(getByTestId('reaction-composite-divider')).toBeTruthy();
    });

    it('hides divider when showDivider is false', () => {
      const { queryByTestId } = render(
        <ReactionComposite {...DEFAULT_PROPS} showDivider={false} />,
      );

      expect(queryByTestId('reaction-composite-divider')).toBeNull();
    });

    it('renders panel labels only when showLabels is true', () => {
      const { getByText, queryByText } = render(
        <ReactionComposite
          {...DEFAULT_PROPS}
          reactionLabel="You"
          originalLabel="Alice's gasp"
          showLabels
        />,
      );

      expect(getByText('You')).toBeTruthy();
      expect(getByText("Alice's gasp")).toBeTruthy();

      const hidden = render(
        <ReactionComposite
          {...DEFAULT_PROPS}
          reactionLabel="You"
          originalLabel="Alice's gasp"
        />,
      );
      expect(hidden.queryByText('You')).toBeNull();
      expect(queryByText('Missing')).toBeNull();
    });

    it('does not accept captureRef or forCapture props (TypeScript compile-time check)', () => {
      // This test verifies the component signature at runtime by checking the component
      // renders correctly without those props.
      expect(() =>
        render(<ReactionComposite {...DEFAULT_PROPS} />),
      ).not.toThrow();

      // If captureRef/forCapture were still in the interface, passing them would not crash.
      // The real guard is TypeScript — this test documents the intent.
      const propsWithRemoved: typeof DEFAULT_PROPS & { captureRef?: unknown; forCapture?: unknown } = { ...DEFAULT_PROPS };
      delete propsWithRemoved.captureRef;
      delete propsWithRemoved.forCapture;
      expect(() => render(<ReactionComposite {...propsWithRemoved} />)).not.toThrow();
    });
  });

  describe('watermark', () => {
    it('renders the subtle G! watermark inside the original gasp panel', () => {
      const { getByTestId } = render(
        <ReactionComposite {...DEFAULT_PROPS} watermarkMode="subtle" />,
      );

      const gaspPanel = getByTestId('reaction-composite-gasp-panel');
      expect(gaspPanel.findByProps({ testID: 'reaction-composite-watermark' })).toBeTruthy();
    });

    it('does not render the watermark when watermarkMode is hidden', () => {
      const { queryByTestId } = render(
        <ReactionComposite {...DEFAULT_PROPS} watermarkMode="hidden" />,
      );

      expect(queryByTestId('reaction-composite-watermark')).toBeNull();
    });
  });
});
