import { View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownRingProps {
  /** 0 → 1 while the countdown charges. */
  progress: SharedValue<number>;
  size: number;
  strokeWidth?: number;
  /** Diameter of the soft brand glow drawn behind the ring. */
  glowSize: number;
}

/**
 * Brand-gradient ring that "charges" during the 3-2-1 countdown, over a soft
 * glow. Drawn centered in a glowSize × glowSize box.
 */
export function CountdownRing({ progress, size, strokeWidth = 7, glowSize }: CountdownRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = glowSize / 2;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View style={{ width: glowSize, height: glowSize }} pointerEvents="none">
      <Svg width={glowSize} height={glowSize}>
        <Defs>
          <RadialGradient id="countdownGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.accentPink} stopOpacity={0.5} />
            <Stop offset="0.45" stopColor={colors.primary} stopOpacity={0.25} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="countdownStroke" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.accentCyan} />
            <Stop offset="0.5" stopColor={colors.accentPink} />
            <Stop offset="1" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={glowSize / 2} fill="url(#countdownGlow)" />
        <Circle cx={center} cy={center} r={radius} fill="rgba(255, 255, 255, 0.08)"
          stroke="rgba(255, 255, 255, 0.2)" strokeWidth={strokeWidth} />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#countdownStroke)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
}
