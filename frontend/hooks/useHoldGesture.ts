import { useCallback, useRef, useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { HOLD_DURATION_MS } from '@/constants/animations';
import { heavyHaptic, successHaptic } from '@/utils/haptics';

interface UseHoldGestureProps {
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  onHoldComplete?: () => void;
  duration?: number;
}

export function useHoldGesture({
  onHoldStart,
  onHoldEnd,
  onHoldComplete,
  duration = HOLD_DURATION_MS,
}: UseHoldGestureProps = {}) {
  const isHolding = useSharedValue(0);
  // holdProgress is driven externally via startProgressAnimation() after the
  // countdown completes — NOT auto-animated on hold start.
  const holdProgress = useSharedValue(0);
  const holdCompleteRef = useRef(false);
  const durationSV = useSharedValue(duration);

  useEffect(() => {
    durationSV.value = duration;
  }, [duration, durationSV]);

  const handleHoldStart = useCallback(() => {
    holdCompleteRef.current = false;
    heavyHaptic();
    onHoldStart?.();
  }, [onHoldStart]);

  const handleHoldEnd = useCallback(() => {
    onHoldEnd?.();
  }, [onHoldEnd]);

  const handleHoldComplete = useCallback(() => {
    if (!holdCompleteRef.current) {
      holdCompleteRef.current = true;
      successHaptic();
      onHoldComplete?.();
    }
  }, [onHoldComplete]);

  // Called by the parent after countdown completes to start the ring animation.
  // Duration reflects gasp media duration, independent of the countdown.
  const startProgressAnimation = useCallback(() => {
    holdCompleteRef.current = false;
    holdProgress.value = 0;
    holdProgress.value = withTiming(1, { duration: durationSV.value }, (finished) => {
      if (finished) {
        runOnJS(handleHoldComplete)();
      }
    });
  }, [holdProgress, durationSV, handleHoldComplete]);

  const resetProgress = useCallback(() => {
    cancelAnimation(holdProgress);
    holdProgress.value = withTiming(0, { duration: 200 });
    holdCompleteRef.current = false;
  }, [holdProgress]);

  const gesture = Gesture.LongPress()
    .minDuration(0)
    .maxDistance(60)
    .onStart(() => {
      isHolding.set(1);
      // Ring starts only after countdown via startProgressAnimation().
      runOnJS(handleHoldStart)();
    })
    .onEnd(() => {
      isHolding.set(0);
      cancelAnimation(holdProgress);
      holdProgress.value = withTiming(0, { duration: 200 });
      runOnJS(handleHoldEnd)();
    });

  return {
    gesture,
    isHolding,
    holdProgress,
    startProgressAnimation,
    resetProgress,
  };
}
