import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';

interface TimerCountdownProps {
  seconds: number;
  onComplete: () => void;
}

export function TimerCountdown({ seconds, onComplete }: TimerCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const timeout = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timeout);
  }, [remaining, onComplete]);

  if (remaining <= 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        key={remaining}
        entering={ZoomIn.duration(200)}
        exiting={ZoomOut.duration(150)}
        style={styles.circle}
      >
        <Text variant="title" style={styles.number}>{remaining}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 30,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  number: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
