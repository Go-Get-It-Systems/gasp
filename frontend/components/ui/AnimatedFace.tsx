import { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Line, Rect } from 'react-native-svg';
import { springConfigs, timingConfigs } from '@/constants/animations';
import { colors } from '@/constants/colors';
import { GradientCircle } from '@/components/ui/GradientCircle';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Expression = 'happy' | 'shocked' | 'angry' | 'love' | 'cool' | 'sad';

const EXPRESSIONS: Expression[] = ['happy', 'shocked', 'sad', 'angry', 'love', 'cool'];

// Expression index for color interpolation: happy=0, shocked=1, angry=2, love=3, cool=4
const EXPRESSION_GLOW_COLORS = [
  '#EC4899', // happy — pink
  '#8B5CF6', // shocked — purple
  '#3B82F6', // sad — blue
  '#EF4444', // angry — red
  '#EC4899', // love — magenta/pink
  '#06B6D4', // cool — cyan
];

interface ExpressionConfig {
  eyeRx: number;
  eyeRy: number;
  eyeOpacity: number;
  pupilCy: number;
  pupilOpacity: number;
  sparkleOpacity: number;
  eyebrowOpacity: number;
  impactLineOpacity: number;
  heartEyeOpacity: number;
  sunglassesOpacity: number;
  smileOpacity: number;
  gaspOpacity: number;
  flatOpacity: number;
  smallSmileOpacity: number;
  frownOpacity: number;
  sadBrowOpacity: number;
}

const EXPRESSION_CONFIGS: Record<Expression, ExpressionConfig> = {
  happy: {
    eyeRx: 10, eyeRy: 10, eyeOpacity: 1, pupilCy: 80, pupilOpacity: 1,
    sparkleOpacity: 1, eyebrowOpacity: 0, impactLineOpacity: 0,
    heartEyeOpacity: 0, sunglassesOpacity: 0,
    smileOpacity: 1, gaspOpacity: 0, flatOpacity: 0, smallSmileOpacity: 0,
    frownOpacity: 0, sadBrowOpacity: 0,
  },
  shocked: {
    eyeRx: 10, eyeRy: 22, eyeOpacity: 1, pupilCy: 88, pupilOpacity: 1,
    sparkleOpacity: 0, eyebrowOpacity: 0, impactLineOpacity: 1,
    heartEyeOpacity: 0, sunglassesOpacity: 0,
    smileOpacity: 0, gaspOpacity: 1, flatOpacity: 0, smallSmileOpacity: 0,
    frownOpacity: 0, sadBrowOpacity: 0,
  },
  sad: {
    eyeRx: 10, eyeRy: 8, eyeOpacity: 1, pupilCy: 82, pupilOpacity: 1,
    sparkleOpacity: 0, eyebrowOpacity: 0, impactLineOpacity: 0,
    heartEyeOpacity: 0, sunglassesOpacity: 0,
    smileOpacity: 0, gaspOpacity: 0, flatOpacity: 0, smallSmileOpacity: 0,
    frownOpacity: 1, sadBrowOpacity: 1,
  },
  angry: {
    eyeRx: 10, eyeRy: 6, eyeOpacity: 1, pupilCy: 80, pupilOpacity: 1,
    sparkleOpacity: 0, eyebrowOpacity: 1, impactLineOpacity: 0,
    heartEyeOpacity: 0, sunglassesOpacity: 0,
    smileOpacity: 0, gaspOpacity: 0, flatOpacity: 1, smallSmileOpacity: 0,
    frownOpacity: 0, sadBrowOpacity: 0,
  },
  love: {
    eyeRx: 0, eyeRy: 0, eyeOpacity: 0, pupilCy: 80, pupilOpacity: 0,
    sparkleOpacity: 0, eyebrowOpacity: 0, impactLineOpacity: 0,
    heartEyeOpacity: 1, sunglassesOpacity: 0,
    smileOpacity: 1, gaspOpacity: 0, flatOpacity: 0, smallSmileOpacity: 0,
    frownOpacity: 0, sadBrowOpacity: 0,
  },
  cool: {
    eyeRx: 0, eyeRy: 0, eyeOpacity: 0, pupilCy: 80, pupilOpacity: 0,
    sparkleOpacity: 0, eyebrowOpacity: 0, impactLineOpacity: 0,
    heartEyeOpacity: 0, sunglassesOpacity: 1,
    smileOpacity: 0, gaspOpacity: 0, flatOpacity: 0, smallSmileOpacity: 1,
    frownOpacity: 0, sadBrowOpacity: 0,
  },
};

const MOUTH_SMILE = 'M 70 130 Q 100 155 130 130';
const MOUTH_SMALL_SMILE = 'M 80 132 Q 100 145 120 132';
const MOUTH_FROWN = 'M 70 140 Q 100 125 130 140';
const HEART_LEFT = 'M 70 71 C 69 68, 63 68, 63 73 C 63 78, 70 84, 70 89 C 70 84, 77 78, 77 73 C 77 68, 71 68, 70 71 Z';
const HEART_RIGHT = 'M 130 71 C 129 68, 123 68, 123 73 C 123 78, 130 84, 130 89 C 130 84, 137 78, 137 73 C 137 68, 131 68, 130 71 Z';

const IMPACT_LINES = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
  const rad = (angle * Math.PI) / 180;
  return {
    x1: 100 + Math.cos(rad) * 85,
    y1: 100 + Math.sin(rad) * 85,
    x2: 100 + Math.cos(rad) * 95,
    y2: 100 + Math.sin(rad) * 95,
  };
});

interface AnimatedFaceProps {
  /** Full size including the gradient ring */
  size: number;
  /** Whether to cycle through expressions automatically */
  animated?: boolean;
  /** Milliseconds between expression changes */
  interval?: number;
}

export function AnimatedFace({ size, animated = true, interval = 2500 }: AnimatedFaceProps) {
  const indexRef = useRef(0);
  const svgSize = size * 0.75;

  // Expression shared values
  const eyeRx = useSharedValue(EXPRESSION_CONFIGS.happy.eyeRx);
  const eyeRy = useSharedValue(EXPRESSION_CONFIGS.happy.eyeRy);
  const eyeOpacity = useSharedValue(1);
  const pupilCy = useSharedValue(80);
  const pupilOpacity = useSharedValue(1);
  const sparkleOpacity = useSharedValue(1);
  const eyebrowOpacity = useSharedValue(0);
  const impactLineOpacity = useSharedValue(0);
  const heartEyeOpacity = useSharedValue(0);
  const sunglassesOpacity = useSharedValue(0);
  const smileOpacity = useSharedValue(1);
  const gaspOpacity = useSharedValue(0);
  const flatOpacity = useSharedValue(0);
  const smallSmileOpacity = useSharedValue(0);
  const frownOpacity = useSharedValue(0);
  const sadBrowOpacity = useSharedValue(0);

  // Container + ring animation shared values
  const containerScale = useSharedValue(1);
  const containerRotate = useSharedValue(0);
  const floatY = useSharedValue(0);
  const angryShake = useSharedValue(0);
  const glowColorIndex = useSharedValue(0); // 0-5 maps to expression
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const ringPulse = useSharedValue(1);

  // Micro-animation shared values
  const pupilWanderX = useSharedValue(0);
  const sparklePulse = useSharedValue(1);
  const heartPulse = useSharedValue(1);
  const blinkScale = useSharedValue(1);

  // Floating particles shared values (3 staggered floats)
  const pFloat0 = useSharedValue(0);
  const pFloat1 = useSharedValue(0);
  const pFloat2 = useSharedValue(0);
  // Particle visibility per expression
  const pHappyOpacity = useSharedValue(1);
  const pShockedOpacity = useSharedValue(0);
  const pAngryOpacity = useSharedValue(0);
  const pLoveOpacity = useSharedValue(0);
  const pCoolOpacity = useSharedValue(0);
  const pSadOpacity = useSharedValue(0);

  // Continuous floating animation
  useEffect(() => {
    if (!animated) {
      floatY.value = 0;
      return;
    }
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [animated, floatY]);

  // Continuous eye blink
  useEffect(() => {
    if (!animated) return;
    const blink = () => {
      blinkScale.value = withSequence(
        withTiming(0.1, { duration: 80 }),
        withTiming(1, { duration: 120 }),
      );
    };
    const timer = setInterval(blink, 3500);
    return () => clearInterval(timer);
  }, [animated, blinkScale]);

  // Continuous pupil wander
  useEffect(() => {
    if (!animated) {
      pupilWanderX.value = 0;
      return;
    }
    pupilWanderX.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [animated, pupilWanderX]);

  // Continuous ring breathing pulse
  useEffect(() => {
    if (!animated) {
      ringPulse.value = 1;
      return;
    }
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [animated, ringPulse]);

  // Floating particles — 3 staggered loops (different speeds for organic feel)
  useEffect(() => {
    if (!animated) {
      pFloat0.value = 0;
      pFloat1.value = 0;
      pFloat2.value = 0;
      return;
    }
    pFloat0.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 1200, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 800, easing: Easing.in(Easing.sin) }),
      ),
      -1, false,
    );
    pFloat1.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 1500, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 1000, easing: Easing.in(Easing.sin) }),
      ),
      -1, false,
    );
    pFloat2.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 1000, easing: Easing.out(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.in(Easing.sin) }),
      ),
      -1, false,
    );
  }, [animated, pFloat0, pFloat1, pFloat2]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs from useSharedValue
  const updateExpression = useCallback((expr: Expression) => {
    const config = EXPRESSION_CONFIGS[expr];
    const spring = springConfigs.snappy;
    const bouncySpring = springConfigs.bouncy;
    const timing = timingConfigs.fast;
    const exprIndex = EXPRESSIONS.indexOf(expr);

    // Bounce the whole unit (ring + face) on expression change
    containerScale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1, bouncySpring),
    );

    // Slight rotation kick
    const rotationDir = Math.random() > 0.5 ? 1 : -1;
    containerRotate.value = withSequence(
      withTiming(rotationDir * 8, { duration: 120 }),
      withSpring(0, { damping: 8, stiffness: 200, mass: 0.3 }),
    );

    // Glow color transition
    glowColorIndex.value = withTiming(exprIndex, { duration: 300 });

    // Glow burst on expression change
    glowOpacity.value = withSequence(
      withTiming(0.7, { duration: 150 }),
      withTiming(0.3, { duration: 400 }),
    );
    glowScale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 }),
    );

    // Shape morphing with spring
    eyeRx.value = withSpring(config.eyeRx, spring);
    eyeRy.value = withSpring(config.eyeRy, spring);
    pupilCy.value = withSpring(config.pupilCy, spring);

    // Opacity crossfades
    eyeOpacity.value = withTiming(config.eyeOpacity, timing);
    pupilOpacity.value = withTiming(config.pupilOpacity, timing);
    sparkleOpacity.value = withTiming(config.sparkleOpacity, timing);
    eyebrowOpacity.value = withTiming(config.eyebrowOpacity, timing);
    impactLineOpacity.value = withTiming(config.impactLineOpacity, timing);
    heartEyeOpacity.value = withTiming(config.heartEyeOpacity, timing);
    sunglassesOpacity.value = withTiming(config.sunglassesOpacity, timing);
    smileOpacity.value = withTiming(config.smileOpacity, timing);
    gaspOpacity.value = withTiming(config.gaspOpacity, timing);
    flatOpacity.value = withTiming(config.flatOpacity, timing);
    smallSmileOpacity.value = withTiming(config.smallSmileOpacity, timing);
    frownOpacity.value = withTiming(config.frownOpacity, timing);
    sadBrowOpacity.value = withTiming(config.sadBrowOpacity, timing);

    // Particle visibility per expression
    const pTiming = { duration: 300 };
    pHappyOpacity.value = withTiming(expr === 'happy' ? 1 : 0, pTiming);
    pShockedOpacity.value = withTiming(expr === 'shocked' ? 1 : 0, pTiming);
    pAngryOpacity.value = withTiming(expr === 'angry' ? 1 : 0, pTiming);
    pLoveOpacity.value = withTiming(expr === 'love' ? 1 : 0, pTiming);
    pCoolOpacity.value = withTiming(expr === 'cool' ? 1 : 0, pTiming);
    pSadOpacity.value = withTiming(expr === 'sad' ? 1 : 0, pTiming);

    // Stop all expression-specific loops first
    sparklePulse.value = 1;
    heartPulse.value = 1;
    angryShake.value = 0;

    if (expr === 'happy') {
      sparklePulse.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else if (expr === 'love') {
      heartPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: 400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else if (expr === 'angry') {
      angryShake.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 50 }),
          withTiming(-2, { duration: 50 }),
        ),
        -1,
        true,
      );
    }
  }, []);

  // Expression cycling
  useEffect(() => {
    if (!animated) return;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % EXPRESSIONS.length;
      updateExpression(EXPRESSIONS[indexRef.current]);
    }, interval);
    return () => clearInterval(timer);
  }, [animated, interval, updateExpression]);

  // Container style — moves ring + face together
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: containerScale.value * ringPulse.value },
      { rotate: `${containerRotate.value + angryShake.value}deg` },
    ],
  }));

  // Glow behind the ring — changes color per expression
  const glowStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      glowColorIndex.value,
      [0, 1, 2, 3, 4, 5],
      EXPRESSION_GLOW_COLORS,
    );
    return {
      backgroundColor: color,
      opacity: glowOpacity.value,
      transform: [{ scale: glowScale.value }],
    };
  });

  // SVG animated props
  const eyeAnimatedProps = useAnimatedProps(() => ({
    rx: eyeRx.value,
    ry: eyeRy.value * blinkScale.value,
    opacity: eyeOpacity.value,
  }));
  const pupilAnimatedProps = useAnimatedProps(() => ({
    cx: 70 + pupilWanderX.value,
    cy: pupilCy.value,
    opacity: pupilOpacity.value * blinkScale.value,
  }));
  const pupilRightAnimatedProps = useAnimatedProps(() => ({
    cx: 130 + pupilWanderX.value,
    cy: pupilCy.value,
    opacity: pupilOpacity.value * blinkScale.value,
  }));
  const sparkleAnimatedProps = useAnimatedProps(() => ({
    opacity: sparkleOpacity.value * sparklePulse.value,
  }));
  const heartLeftAnimatedProps = useAnimatedProps(() => ({
    opacity: heartEyeOpacity.value,
    strokeWidth: heartPulse.value > 1 ? (heartPulse.value - 1) * 4 : 0,
  }));
  const heartRightAnimatedProps = useAnimatedProps(() => ({
    opacity: heartEyeOpacity.value,
    strokeWidth: heartPulse.value > 1 ? (heartPulse.value - 1) * 4 : 0,
  }));
  const sunglassesAnimProps = useAnimatedProps(() => ({
    opacity: sunglassesOpacity.value,
  }));
  const shineAnimProps = useAnimatedProps(() => ({
    opacity: sunglassesOpacity.value * 0.6,
  }));
  const smileAnimProps = useAnimatedProps(() => ({
    opacity: smileOpacity.value,
  }));
  const gaspAnimProps = useAnimatedProps(() => ({
    opacity: gaspOpacity.value,
  }));
  const flatAnimProps = useAnimatedProps(() => ({
    opacity: flatOpacity.value,
  }));
  const smallSmileAnimProps = useAnimatedProps(() => ({
    opacity: smallSmileOpacity.value,
  }));
  const eyebrowAnimProps = useAnimatedProps(() => ({
    opacity: eyebrowOpacity.value,
  }));
  const impactLineAnimatedProps = useAnimatedProps(() => ({
    opacity: impactLineOpacity.value,
  }));
  const frownAnimProps = useAnimatedProps(() => ({
    opacity: frownOpacity.value,
  }));
  const sadBrowAnimProps = useAnimatedProps(() => ({
    opacity: sadBrowOpacity.value,
  }));

  // Particle styles — 5 groups, 3 particles each, staggered floats
  const useParticleStyle = (
    opacityVal: SharedValue<number>,
    floatVal: SharedValue<number>,
    angle: number,
    radius: number,
  ) => {
    const rad = (angle * Math.PI) / 180;
    const cx = size / 2 + Math.cos(rad) * radius;
    const cy = size / 2 + Math.sin(rad) * radius;
    return useAnimatedStyle(() => ({
      position: 'absolute' as const,
      left: cx - 8,
      top: cy - 8,
      opacity: opacityVal.value * (1 - Math.abs(floatVal.value) / 25),
      transform: [
        { translateY: floatVal.value },
        { scale: 0.6 + (1 - Math.abs(floatVal.value) / 25) * 0.5 },
      ],
    }));
  };

  const r = size * 0.55; // particle orbit radius (just outside the ring)

  // Happy particles: ✨
  const happyP0 = useParticleStyle(pHappyOpacity, pFloat0, -40, r);
  const happyP1 = useParticleStyle(pHappyOpacity, pFloat1, 160, r);
  const happyP2 = useParticleStyle(pHappyOpacity, pFloat2, 60, r * 0.95);

  // Shocked particles: ⚡
  const shockedP0 = useParticleStyle(pShockedOpacity, pFloat0, -30, r);
  const shockedP1 = useParticleStyle(pShockedOpacity, pFloat1, 200, r);
  const shockedP2 = useParticleStyle(pShockedOpacity, pFloat2, 90, r * 0.9);

  // Angry particles: 🔥
  const angryP0 = useParticleStyle(pAngryOpacity, pFloat0, -50, r);
  const angryP1 = useParticleStyle(pAngryOpacity, pFloat1, 230, r);
  const angryP2 = useParticleStyle(pAngryOpacity, pFloat2, 50, r * 0.95);

  // Love particles: ❤️
  const loveP0 = useParticleStyle(pLoveOpacity, pFloat0, -45, r);
  const loveP1 = useParticleStyle(pLoveOpacity, pFloat1, 180, r);
  const loveP2 = useParticleStyle(pLoveOpacity, pFloat2, 70, r * 0.9);

  // Cool particles: ⭐
  const coolP0 = useParticleStyle(pCoolOpacity, pFloat0, -20, r);
  const coolP1 = useParticleStyle(pCoolOpacity, pFloat1, 210, r);
  const coolP2 = useParticleStyle(pCoolOpacity, pFloat2, 100, r * 0.95);

  // Sad particles: 💧
  const sadP0 = useParticleStyle(pSadOpacity, pFloat0, -35, r);
  const sadP1 = useParticleStyle(pSadOpacity, pFloat1, 190, r);
  const sadP2 = useParticleStyle(pSadOpacity, pFloat2, 80, r * 0.9);

  return (
    <Animated.View style={[styles.outerContainer, containerStyle, { width: size * 1.3, height: size * 1.3 }]}>
      {/* Animated glow behind the ring — color shifts per expression */}
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          {
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: size * 0.45,
          },
        ]}
      />

      {/* Gradient ring (static gradient, animated by container transforms) */}
      <GradientCircle size={size}>
        <Svg width={svgSize} height={svgSize} viewBox="0 0 200 200">
          {/* Left Eye */}
          <AnimatedEllipse
            animatedProps={eyeAnimatedProps}
            cx={70} cy={80}
            fill={colors.accentPink}
          />
          <AnimatedCircle
            animatedProps={pupilAnimatedProps}
            r={4}
            fill={colors.background}
          />
          <AnimatedCircle
            animatedProps={sparkleAnimatedProps}
            cx={72} cy={78} r={2}
            fill={colors.textPrimary}
          />

          {/* Right Eye */}
          <AnimatedEllipse
            animatedProps={eyeAnimatedProps}
            cx={130} cy={80}
            fill={colors.accentPink}
          />
          <AnimatedCircle
            animatedProps={pupilRightAnimatedProps}
            r={4}
            fill={colors.background}
          />
          <AnimatedCircle
            animatedProps={sparkleAnimatedProps}
            cx={132} cy={78} r={2}
            fill={colors.textPrimary}
          />

          {/* Heart Eyes (love) */}
          <AnimatedPath
            animatedProps={heartLeftAnimatedProps}
            d={HEART_LEFT}
            fill={colors.accentPink}
            stroke={colors.accentPink}
          />
          <AnimatedPath
            animatedProps={heartRightAnimatedProps}
            d={HEART_RIGHT}
            fill={colors.accentPink}
            stroke={colors.accentPink}
          />

          {/* Sunglasses (cool) */}
          <AnimatedRect
            animatedProps={sunglassesAnimProps}
            x={52} y={70} width={36} height={20} rx={6}
            fill="#1E1E2E"
            stroke={colors.accentCyan}
            strokeWidth={2}
          />
          <AnimatedRect
            animatedProps={sunglassesAnimProps}
            x={112} y={70} width={36} height={20} rx={6}
            fill="#1E1E2E"
            stroke={colors.accentCyan}
            strokeWidth={2}
          />
          <AnimatedLine
            animatedProps={sunglassesAnimProps}
            x1={88} y1={80} x2={112} y2={80}
            stroke={colors.accentCyan}
            strokeWidth={2}
          />
          <AnimatedLine
            animatedProps={shineAnimProps}
            x1={56} y1={74} x2={66} y2={74}
            stroke={colors.textPrimary}
            strokeWidth={1.5}
            strokeLinecap="round"
          />

          {/* Mouth: Smile (happy/love) */}
          <AnimatedPath
            animatedProps={smileAnimProps}
            d={MOUTH_SMILE}
            fill="none"
            stroke={colors.accentCyan}
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* Mouth: Gasp (shocked) */}
          <AnimatedEllipse
            animatedProps={gaspAnimProps}
            cx={100} cy={135}
            rx={18} ry={25}
            fill="none"
            stroke={colors.primaryLight}
            strokeWidth={5}
          />

          {/* Mouth: Flat (angry) */}
          <AnimatedLine
            animatedProps={flatAnimProps}
            x1={75} y1={135} x2={125} y2={135}
            stroke={colors.error}
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* Mouth: Small smile (cool) */}
          <AnimatedPath
            animatedProps={smallSmileAnimProps}
            d={MOUTH_SMALL_SMILE}
            fill="none"
            stroke={colors.accentCyan}
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* Mouth: Frown (sad) */}
          <AnimatedPath
            animatedProps={frownAnimProps}
            d={MOUTH_FROWN}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* Sad eyebrows — drooping down */}
          <AnimatedLine
            animatedProps={sadBrowAnimProps}
            x1={55} y1={70} x2={80} y2={65}
            stroke="#3B82F6"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <AnimatedLine
            animatedProps={sadBrowAnimProps}
            x1={120} y1={65} x2={145} y2={70}
            stroke="#3B82F6"
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Eyebrows (angry) */}
          <AnimatedLine
            animatedProps={eyebrowAnimProps}
            x1={55} y1={62} x2={80} y2={70}
            stroke={colors.error}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <AnimatedLine
            animatedProps={eyebrowAnimProps}
            x1={120} y1={70} x2={145} y2={62}
            stroke={colors.error}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Impact Lines (shocked) */}
          {IMPACT_LINES.map((line, i) => (
            <AnimatedLine
              key={i}
              animatedProps={impactLineAnimatedProps}
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke={colors.primaryLight}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </GradientCircle>

      {/* Floating particles per expression */}
      {/* Happy: ✨ */}
      <Animated.View style={[styles.particle, happyP0]}><Text style={styles.particleText}>✨</Text></Animated.View>
      <Animated.View style={[styles.particle, happyP1]}><Text style={styles.particleText}>✨</Text></Animated.View>
      <Animated.View style={[styles.particle, happyP2]}><Text style={styles.particleText}>⭐</Text></Animated.View>

      {/* Shocked: ⚡ */}
      <Animated.View style={[styles.particle, shockedP0]}><Text style={styles.particleText}>⚡</Text></Animated.View>
      <Animated.View style={[styles.particle, shockedP1]}><Text style={styles.particleText}>💥</Text></Animated.View>
      <Animated.View style={[styles.particle, shockedP2]}><Text style={styles.particleText}>⚡</Text></Animated.View>

      {/* Angry: 🔥 */}
      <Animated.View style={[styles.particle, angryP0]}><Text style={styles.particleText}>🔥</Text></Animated.View>
      <Animated.View style={[styles.particle, angryP1]}><Text style={styles.particleText}>💢</Text></Animated.View>
      <Animated.View style={[styles.particle, angryP2]}><Text style={styles.particleText}>🔥</Text></Animated.View>

      {/* Love: ❤️ */}
      <Animated.View style={[styles.particle, loveP0]}><Text style={styles.particleText}>❤️</Text></Animated.View>
      <Animated.View style={[styles.particle, loveP1]}><Text style={styles.particleText}>💕</Text></Animated.View>
      <Animated.View style={[styles.particle, loveP2]}><Text style={styles.particleText}>❤️</Text></Animated.View>

      {/* Cool: 😎 */}
      <Animated.View style={[styles.particle, coolP0]}><Text style={styles.particleText}>⭐</Text></Animated.View>
      <Animated.View style={[styles.particle, coolP1]}><Text style={styles.particleText}>💎</Text></Animated.View>
      <Animated.View style={[styles.particle, coolP2]}><Text style={styles.particleText}>✨</Text></Animated.View>

      {/* Sad: 😢 */}
      <Animated.View style={[styles.particle, sadP0]}><Text style={styles.particleText}>💧</Text></Animated.View>
      <Animated.View style={[styles.particle, sadP1]}><Text style={styles.particleText}>😢</Text></Animated.View>
      <Animated.View style={[styles.particle, sadP2]}><Text style={styles.particleText}>💧</Text></Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  particle: {
    position: 'absolute',
    width: 16,
    height: 16,
  },
  particleText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
