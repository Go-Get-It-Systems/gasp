import { act, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CaptureButton } from '../CaptureButton';
import { GestureDetector } from 'react-native-gesture-handler';
import type { LongPressGesture } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/longPressGesture';
import type { TapGesture } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/tapGesture';

// Keep the library's actual gesture builders/configuration; only replace the native host.
jest.mock('react-native-gesture-handler', () => ({
  Gesture: jest.requireActual('react-native-gesture-handler/src/handlers/gestures/gestureObjects').GestureObjects,
  GestureDetector: jest.fn(({ children }) => children),
}));

function gestures() {
  const detector = GestureDetector as jest.Mock;
  const composed = detector.mock.calls.at(-1)![0].gesture;
  return composed.toGestureArray() as [LongPressGesture, TapGesture];
}

beforeEach(() => jest.clearAllMocks());

it('keeps the full visible ring as an unscaled touch target during recording', () => {
  const screen = render(<CaptureButton onCapture={jest.fn()} />);
  const before = screen.getByRole('button');
  expect(StyleSheet.flatten(before.props.style)).toMatchObject({ width: 88, height: 88 });
  expect(StyleSheet.flatten(before.props.style).transform).toBeUndefined();
  screen.rerender(<CaptureButton onCapture={jest.fn()} isRecording />);
  const after = screen.getByRole('button');
  expect(after).toBe(before);
  expect(StyleSheet.flatten(after.props.style)).toMatchObject({ width: 88, height: 88 });
});

it('allows movement across the button instead of cancelling after 10 points', () => {
  render(<CaptureButton onCapture={jest.fn()} />);
  const [hold] = gestures();
  expect(hold.config.maxDist).toBeGreaterThanOrEqual(72);
  expect(hold.config.shouldCancelWhenOutside).toBe(false);
  expect(hold.config.minDurationMs).toBe(300);
});

it.each([true, false])('stops an activated hold on release/cancellation (success=%s)', success => {
  const start = jest.fn(); const stop = jest.fn(); const photo = jest.fn();
  render(<CaptureButton onCapture={photo} onLongPressStart={start} onLongPressEnd={stop} />);
  const [hold] = gestures();
  act(() => hold.handlers.onStart?.({} as never));
  expect(start).toHaveBeenCalledTimes(1);
  expect(stop).not.toHaveBeenCalled();
  act(() => hold.handlers.onEnd?.({} as never, success));
  expect(stop).toHaveBeenCalledTimes(1);
  expect(photo).not.toHaveBeenCalled();
});

it('takes a photo only when the tap succeeds', () => {
  const photo = jest.fn(); const start = jest.fn();
  render(<CaptureButton onCapture={photo} onLongPressStart={start} />);
  const [, tap] = gestures();
  act(() => tap.handlers.onEnd?.({} as never, false));
  expect(photo).not.toHaveBeenCalled();
  act(() => tap.handlers.onEnd?.({} as never, true));
  expect(photo).toHaveBeenCalledTimes(1);
  expect(start).not.toHaveBeenCalled();
});
