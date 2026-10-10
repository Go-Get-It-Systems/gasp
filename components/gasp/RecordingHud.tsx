import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';

const HINT_VISIBLE_MS = 1500;

interface RecordingHudProps {
  /** 0 → 1 over the gasp duration. */
  progress: SharedValue<number>;
  /** The HUD shows once the gasp starts opening… */
  isRevealed: SharedValue<number>;
  /** …and only while the finger is still down (it stops on release). */
  isHolding: SharedValue<number>;
}

function formatElapsed(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The single indicator while the gasp is open and the reaction records:
 * a Stories-style bar for how much of the gasp is left, a "REC 0:03" chip in
 * the same row as the close button, and a brief "Let go to finish" hint.
 */
export function RecordingHud({ progress, isRevealed, isHolding }: RecordingHudProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(false);
  const [elapsedS, setElapsedS] = useState(0);
  const hintOpacity = useSharedValue(0);

  useAnimatedReaction(
    () => isRevealed.get() > 0 && isHolding.get() > 0,
    (revealed, previous) => {
      if (revealed !== previous) runOnJS(setActive)(revealed);
    },
  );

  useEffect(() => {
    if (!active) {
      setElapsedS(0);
      hintOpacity.value = 0;
      return;
    }
    hintOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(HINT_VISIBLE_MS, withTiming(0, { duration: 300 })),
    );
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedS(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, [active, hintOpacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: isRevealed.get() * isHolding.get() }));
  const barFillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.get() }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents="none">
      <View style={[styles.bar, { top: insets.top + 2 }]}>
        <Animated.View style={[styles.barFill, barFillStyle]} />
      </View>
      <View
        style={[styles.chip, { top: insets.top + 12 }]}
        accessible
        accessibilityLabel={t('viewGasp.recordingElapsed', { seconds: elapsedS })}
      >
        <View style={styles.recDot} />
        <Text style={styles.chipText}>{`REC ${formatElapsed(elapsedS)}`}</Text>
      </View>
      <Animated.View style={[styles.hint, { bottom: insets.bottom + 40 }, hintStyle]}>
        <Text style={styles.hintText}>{t('viewGasp.letGoToFinish')}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  // Same height and backdrop as the close button it shares a row with.
  chip: {
    position: 'absolute',
    left: 20,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
