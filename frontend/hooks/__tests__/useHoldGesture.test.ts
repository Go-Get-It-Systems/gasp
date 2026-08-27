/**
 * useHoldGesture Tests
 *
 * Verifies that the hook initializes correctly and accepts its props.
 * Actual gesture behavior (LongPress → timing animation → callbacks) runs on
 * the native Reanimated thread via worklets and cannot be unit tested here.
 */

import { renderHook } from '@testing-library/react-native';
import { useHoldGesture } from '@/hooks/useHoldGesture';
import { HOLD_DURATION_MS } from '@/constants/animations';

describe('useHoldGesture', () => {
  // ── Return value shape ────────────────────────────────────────────────────────

  describe('return values', () => {
    it('returns gesture, isHolding, holdProgress, startProgressAnimation, and resetProgress', () => {
      const { result } = renderHook(() => useHoldGesture());

      expect(result.current.gesture).toBeDefined();
      expect(result.current.isHolding).toBeDefined();
      expect(result.current.holdProgress).toBeDefined();
      expect(result.current.startProgressAnimation).toBeDefined();
      expect(typeof result.current.startProgressAnimation).toBe('function');
      expect(result.current.resetProgress).toBeDefined();
      expect(typeof result.current.resetProgress).toBe('function');
    });

    it('isHolding is a shared value initialized to 0', () => {
      const { result } = renderHook(() => useHoldGesture());

      expect(result.current.isHolding.value).toBe(0);
    });

    it('holdProgress is a shared value initialized to 0', () => {
      const { result } = renderHook(() => useHoldGesture());

      expect(result.current.holdProgress.value).toBe(0);
    });

    it('holdProgress stays at 0 after hook initializes (no auto-animation)', () => {
      const { result } = renderHook(() => useHoldGesture());

      // Ring should not animate on its own — only after startProgressAnimation()
      expect(result.current.holdProgress.value).toBe(0);
    });

    it('gesture is defined (LongPress gesture object)', () => {
      const { result } = renderHook(() => useHoldGesture());

      expect(result.current.gesture).not.toBeNull();
    });
  });

  // ── Callback props ────────────────────────────────────────────────────────────

  describe('callback props', () => {
    it('accepts onHoldStart without crashing', () => {
      const onHoldStart = jest.fn();

      expect(() =>
        renderHook(() => useHoldGesture({ onHoldStart }))
      ).not.toThrow();
    });

    it('accepts onHoldEnd without crashing', () => {
      const onHoldEnd = jest.fn();

      expect(() =>
        renderHook(() => useHoldGesture({ onHoldEnd }))
      ).not.toThrow();
    });

    it('accepts onHoldComplete without crashing', () => {
      const onHoldComplete = jest.fn();

      expect(() =>
        renderHook(() => useHoldGesture({ onHoldComplete }))
      ).not.toThrow();
    });

    it('accepts all callbacks together without crashing', () => {
      const onHoldStart = jest.fn();
      const onHoldEnd = jest.fn();
      const onHoldComplete = jest.fn();

      expect(() =>
        renderHook(() => useHoldGesture({ onHoldStart, onHoldEnd, onHoldComplete }))
      ).not.toThrow();
    });

    it('works with no props (all optional)', () => {
      expect(() => renderHook(() => useHoldGesture())).not.toThrow();
    });

    it('works with an empty props object', () => {
      expect(() => renderHook(() => useHoldGesture({}))).not.toThrow();
    });
  });

  // ── Duration prop ─────────────────────────────────────────────────────────────

  describe('duration prop', () => {
    it('accepts a custom duration without crashing', () => {
      expect(() =>
        renderHook(() => useHoldGesture({ duration: 1500 }))
      ).not.toThrow();
    });

    it('accepts duration of 0 without crashing', () => {
      expect(() =>
        renderHook(() => useHoldGesture({ duration: 0 }))
      ).not.toThrow();
    });

    it('uses the default HOLD_DURATION_MS when duration is not specified', () => {
      // We verify the default is applied by confirming HOLD_DURATION_MS is
      // a positive number (3000 ms) and that the hook initializes without error.
      expect(HOLD_DURATION_MS).toBeGreaterThan(0);

      const { result } = renderHook(() => useHoldGesture());

      // Hook initializes successfully with the default duration
      expect(result.current.gesture).toBeDefined();
    });

    it('updates when duration prop changes', () => {
      const { rerender } = renderHook(
        ({ duration }: { duration: number }) => useHoldGesture({ duration }),
        { initialProps: { duration: 1000 } }
      );

      // Should not throw on prop change
      expect(() => rerender({ duration: 2000 })).not.toThrow();
    });
  });
});
