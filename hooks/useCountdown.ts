import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownProps {
  duration: number; // in seconds
  onComplete?: () => void;
  autoStart?: boolean;
}

export function useCountdown({
  duration,
  onComplete,
  autoStart = false,
}: UseCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
    setTimeLeft(duration);
  }, [duration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setTimeLeft(duration);
  }, [stop, duration]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stop();
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, stop, onComplete]);

  const progress = 1 - timeLeft / duration;

  return {
    timeLeft,
    progress,
    isRunning,
    start,
    stop,
    reset,
  };
}
