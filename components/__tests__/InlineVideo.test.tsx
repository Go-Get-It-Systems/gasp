import React from 'react';
import { act, render } from '@testing-library/react-native';
import { InlineVideo } from '../ui/InlineVideo';

const mockListeners = new Set<(event: { status: string }) => void>();
const mockPlayer = {
  status: 'loading',
  play: jest.fn(),
  pause: jest.fn(),
  muted: true,
  addListener: jest.fn((_event: string, listener: (event: { status: string }) => void) => {
    mockListeners.add(listener);
    return { remove: () => mockListeners.delete(listener) };
  }),
};

jest.mock('expo-video', () => ({
  useVideoPlayer: () => mockPlayer,
  VideoView: 'VideoView',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockListeners.clear();
  mockPlayer.status = 'loading';
});

function finishLoading() {
  act(() => {
    mockPlayer.status = 'readyToPlay';
    for (const listener of mockListeners) listener({ status: 'readyToPlay' });
  });
}

describe('InlineVideo loading and pause changes', () => {
  it('does not resume on load after the caller paused the video', () => {
    const screen = render(<InlineVideo uri="file:///video.mp4" style={{}} paused={false} />);
    screen.rerender(<InlineVideo uri="file:///video.mp4" style={{}} paused />);
    mockPlayer.play.mockClear();
    finishLoading();
    expect(mockPlayer.play).not.toHaveBeenCalled();
    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockListeners.size).toBe(1);
    screen.unmount();
    expect(mockListeners.size).toBe(0);
  });

  it('plays on load after the caller resumed the video', () => {
    const screen = render(<InlineVideo uri="file:///video.mp4" style={{}} paused />);
    screen.rerender(<InlineVideo uri="file:///video.mp4" style={{}} paused={false} />);
    mockPlayer.play.mockClear();
    finishLoading();
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });
});
