import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Timer, Grid3x3 } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface EffectsPanelProps {
  timerDuration: 0 | 3 | 10;
  showGrid: boolean;
  onCycleTimer: () => void;
  onToggleGrid: () => void;
}

const TIMER_LABELS: Record<number, string> = { 0: 'Off', 3: '3s', 10: '10s' };

export function EffectsPanel({
  timerDuration,
  showGrid,
  onCycleTimer,
  onToggleGrid,
}: EffectsPanelProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      style={styles.container}
    >
      {/* Timer */}
      <Pressable onPress={onCycleTimer} style={styles.option}>
        <View style={[styles.iconCircle, timerDuration > 0 && styles.iconCircleActive]}>
          <Timer size={20} color={timerDuration > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
          {timerDuration > 0 && (
            <View style={styles.timerBadge}>
              <Text variant="caption" style={styles.timerBadgeText}>{timerDuration}</Text>
            </View>
          )}
        </View>
        <Text variant="caption" style={[styles.label, timerDuration > 0 && styles.labelActive]}>
          Timer {TIMER_LABELS[timerDuration]}
        </Text>
      </Pressable>

      {/* Grid */}
      <Pressable onPress={onToggleGrid} style={styles.option}>
        <View style={[styles.iconCircle, showGrid && styles.iconCircleActive]}>
          <Grid3x3 size={20} color={showGrid ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
        </View>
        <Text variant="caption" style={[styles.label, showGrid && styles.labelActive]}>
          Grid
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 56,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.primary,
  },
  timerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.accentPink,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
