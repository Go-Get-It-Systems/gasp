import { type ReactNode } from 'react';
import { Pressable, ActivityIndicator, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { clsx } from 'clsx';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether to show a loading spinner */
  loading?: boolean;
  /** Icon element rendered before the label */
  leftIcon?: ReactNode;
  /** Icon element rendered after the label */
  rightIcon?: ReactNode;
  /** Button label content */
  children: ReactNode;
  /** Press handler */
  onPress?: () => void;
  /** NativeWind class names */
  className?: string;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 13 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 15 },
  lg: { height: 56, paddingHorizontal: 28, fontSize: 17 },
};

const VARIANT_STYLES: Record<
  ButtonVariant,
  {
    backgroundColor: string;
    borderWidth: number;
    borderColor: string;
    textColor: string;
    backgroundImage?: string;
  }
> = {
  primary: {
    backgroundColor: '#7C3AED',
    borderWidth: 0,
    borderColor: 'transparent',
    textColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
  },
  secondary: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    textColor: '#FFFFFF',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7C3AED',
    textColor: '#7C3AED',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    textColor: '#FFFFFF',
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  onPress,
  className,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.set(withTiming(0.97, { duration: 100 }));
    })
    .onFinalize(() => {
      'worklet';
      scale.set(withTiming(1, { duration: 150 }));
    })
    .onEnd(() => {
      'worklet';
      if (onPress && !disabled && !loading) {
        runOnJS(onPress)();
      }
    })
    .enabled(!disabled && !loading);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const sizeConfig = SIZE_CONFIG[size];
  const variantStyle = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;
  const textColor = isDisabled ? '#6B7280' : variantStyle.textColor;

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedPressable
        className={clsx(className)}
        disabled={isDisabled}
        style={[
          animatedStyle,
          styles.base,
          {
            height: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            backgroundColor: variantStyle.backgroundColor,
            borderWidth: variantStyle.borderWidth,
            borderColor: variantStyle.borderColor,
            borderRadius: 14,
            borderCurve: 'continuous',
            opacity: isDisabled ? 0.5 : 1,
            ...(variant === 'primary' && variantStyle.backgroundImage
              ? { experimental_backgroundImage: variantStyle.backgroundImage }
              : {}),
          },
        ]}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={textColor}
              style={styles.spinner}
            />
          ) : null}

          {!loading && leftIcon ? (
            <View style={styles.iconLeft}>{leftIcon}</View>
          ) : null}

          {typeof children === 'string' ? (
            <Text
              variant="body"
              weight="600"
              color={textColor}
              style={{ fontSize: sizeConfig.fontSize }}
            >
              {children}
            </Text>
          ) : (
            children
          )}

          {!loading && rightIcon ? (
            <View style={styles.iconRight}>{rightIcon}</View>
          ) : null}
        </View>
      </AnimatedPressable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinner: {
    marginRight: 4,
  },
  iconLeft: {
    marginRight: 2,
  },
  iconRight: {
    marginLeft: 2,
  },
});
