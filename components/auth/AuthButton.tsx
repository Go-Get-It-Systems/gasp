import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Phone, Apple } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type AuthButtonVariant = 'phone' | 'apple';

interface AuthButtonProps {
  variant: AuthButtonVariant;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ICON_MAP = {
  phone: Phone,
  apple: Apple,
} as const;

const LABEL_MAP = {
  phone: 'Continue with Phone',
  apple: 'Continue with Apple',
} as const;

const triggerHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export function AuthButton({ variant, onPress, loading, disabled }: AuthButtonProps) {
  const pressed = useSharedValue(0);
  const isInteractive = !loading && !disabled;

  const tap = Gesture.Tap()
    .enabled(isInteractive)
    .onBegin(() => {
      pressed.set(withTiming(1, { duration: 100 }));
    })
    .onFinalize(() => {
      pressed.set(withTiming(0, { duration: 200 }));
    })
    .onEnd(() => {
      runOnJS(triggerHaptic)();
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pressed.get(), [0, 1], [1, 0.97]) },
    ],
    opacity: interpolate(pressed.get(), [0, 1], [1, 0.9]),
  }));

  const Icon = ICON_MAP[variant];
  const label = LABEL_MAP[variant];

  const isPhone = variant === 'phone';

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !isInteractive }}
        style={[
          styles.button,
          variant === 'phone' && styles.phoneButton,
          variant === 'apple' && styles.darkButton,
          loading && { opacity: 0.7 },
          disabled && { opacity: 0.4 },
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isPhone ? '#000000' : '#FFFFFF'}
          />
        ) : (
          <View style={styles.content}>
            <Icon
              size={20}
              color={isPhone ? '#000000' : '#FFFFFF'}
              strokeWidth={2}
            />
            <Text
              variant="body"
              style={[
                styles.label,
                { color: isPhone ? '#000000' : '#FFFFFF' },
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 60,
    borderRadius: 20,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneButton: {
    backgroundColor: '#FFFFFF',
  },
  darkButton: {
    backgroundColor: 'rgba(24, 24, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
