import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { clsx } from 'clsx';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'filled' | 'ghost';

export interface IconButtonProps {
  /** Icon element to render */
  icon: ReactNode;
  /** Button size */
  size?: IconButtonSize;
  /** Visual style variant */
  variant?: IconButtonVariant;
  /** Press handler */
  onPress?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** NativeWind class names */
  className?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

const SIZE_CONFIG: Record<IconButtonSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

const VARIANT_STYLES: Record<
  IconButtonVariant,
  { backgroundColor: string; borderWidth: number; borderColor: string }
> = {
  default: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  filled: {
    backgroundColor: '#7C3AED',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
};

export function IconButton({
  icon,
  size = 'md',
  variant = 'default',
  onPress,
  disabled = false,
  className,
  accessibilityLabel,
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.set(withTiming(0.9, { duration: 100 }));
    })
    .onFinalize(() => {
      'worklet';
      scale.set(withTiming(1, { duration: 150 }));
    })
    .onEnd(() => {
      'worklet';
      if (onPress && !disabled) {
        runOnJS(onPress)();
      }
    })
    .enabled(!disabled);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const dimension = SIZE_CONFIG[size];
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedPressable
        className={clsx(className)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[
          animatedStyle,
          styles.base,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderCurve: 'continuous',
            backgroundColor: variantStyle.backgroundColor,
            borderWidth: variantStyle.borderWidth,
            borderColor: variantStyle.borderColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {icon}
      </AnimatedPressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
