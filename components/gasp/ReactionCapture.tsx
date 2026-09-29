import { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectionHaptic } from '@/utils/haptics';
import { PIP_WIDTH, PIP_HEIGHT, MARGIN } from './pipPosition';

const STORAGE_KEY = '@gasp/reaction-pip-corner';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRING_CFG = { damping: 15, stiffness: 200, mass: 0.8 };
const BORDER_WIDTH = 2.5;
const RADIUS = (Math.min(PIP_WIDTH, PIP_HEIGHT) / 2) - BORDER_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CORNERS = [
  { x: MARGIN, y: MARGIN + 60 },
  { x: SCREEN_WIDTH - PIP_WIDTH - MARGIN, y: MARGIN + 60 },
  { x: MARGIN, y: SCREEN_HEIGHT - PIP_HEIGHT - MARGIN - 100 },
  { x: SCREEN_WIDTH - PIP_WIDTH - MARGIN, y: SCREEN_HEIGHT - PIP_HEIGHT - MARGIN - 100 },
] as const;

const DEFAULT_CORNER = 1;

async function loadCorner(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const idx = raw !== null ? parseInt(raw, 10) : DEFAULT_CORNER;
  return isNaN(idx) || idx < 0 || idx > 3 ? DEFAULT_CORNER : idx;
}

function persistCorner(idx: number) {
  AsyncStorage.setItem(STORAGE_KEY, String(idx)).catch(() => {});
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ReactionCaptureProps {
  isActive: SharedValue<number>;
  isVisible?: boolean;
  isRecording?: boolean;
  maxDurationS?: number;
  cameraRef?: React.RefObject<CameraView | null>;
  onCornerChange?: (cornerIndex: number) => void;
}

export function ReactionCapture({
  isActive,
  isVisible = false,
  isRecording = false,
  maxDurationS = 30,
  cameraRef,
  onCornerChange,
}: ReactionCaptureProps) {
  const translateX = useSharedValue(CORNERS[DEFAULT_CORNER].x);
  const translateY = useSharedValue(CORNERS[DEFAULT_CORNER].y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const recordingScale = useSharedValue(1);

  // Restored from main: mount/unmount based on isActive to manage AVCapture session
  const [isCameraActive, setIsCameraActive] = useState(false);

  const ringProgress = useSharedValue(0);

  useEffect(() => {
    loadCorner().then((idx) => {
      translateX.value = CORNERS[idx].x;
      translateY.value = CORNERS[idx].y;
    });
  }, [translateX, translateY]);

  // Progress ring + spring entry on recording start
  useEffect(() => {
    if (isRecording) {
      recordingScale.value = 0.85;
      recordingScale.value = withSpring(1, SPRING_CFG);
      ringProgress.value = 0;
      ringProgress.value = withTiming(1, { duration: maxDurationS * 1000 });
    } else {
      ringProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, maxDurationS, ringProgress, recordingScale]);

  // Restored from main: mount on isActive=1, unmount on isActive=0
  useAnimatedReaction(
    () => isActive.get(),
    (current) => {
      runOnJS(setIsCameraActive)(current === 1);
    },
  );

  const snapToNearestCorner = (x: number, y: number) => {
    'worklet';
    let nearestIdx = 0;
    let nearestD = Infinity;
    for (let i = 0; i < CORNERS.length; i++) {
      const d = Math.hypot(CORNERS[i].x - x, CORNERS[i].y - y);
      if (d < nearestD) { nearestD = d; nearestIdx = i; }
    }
    translateX.value = withSpring(CORNERS[nearestIdx].x, SPRING_CFG);
    translateY.value = withSpring(CORNERS[nearestIdx].y, SPRING_CFG);
    runOnJS(selectionHaptic)();
    runOnJS(persistCorner)(nearestIdx);
    if (onCornerChange) runOnJS(onCornerChange)(nearestIdx);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = Math.max(MARGIN, Math.min(SCREEN_WIDTH - PIP_WIDTH - MARGIN, startX.value + e.translationX));
      translateY.value = Math.max(MARGIN, Math.min(SCREEN_HEIGHT - PIP_HEIGHT - MARGIN, startY.value + e.translationY));
    })
    .onEnd(() => {
      snapToNearestCorner(translateX.value, translateY.value);
    });

  const isVisibleSV = useSharedValue(isVisible ? 1 : 0);
  useEffect(() => { isVisibleSV.value = isVisible ? 1 : 0; }, [isVisible, isVisibleSV]);

  const animatedStyle = useAnimatedStyle(() => {
    const visible = isVisibleSV.get();
    const active = isActive.get();
    const opacity = visible === 0 ? 0 : interpolate(active, [0, 1], [0.85, 1]);
    const scale = (visible === 0 ? 0 : interpolate(active, [0, 1], [0.9, 1])) * recordingScale.get();
    return {
      opacity,
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { scale },
      ],
    };
  });

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      ringProgress.get(),
      [0, 0.7, 1],
      ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.4)', '#EF4444'],
    );
    return { borderColor: color };
  });

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringProgress.get() * CIRCUMFERENCE,
  }));

  const cx = PIP_WIDTH / 2;
  const cy = PIP_HEIGHT / 2;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {isRecording && (
          <Svg width={PIP_WIDTH} height={PIP_HEIGHT} style={StyleSheet.absoluteFill}>
            <Circle cx={cx} cy={cy} r={RADIUS} stroke="rgba(255,255,255,0.15)" strokeWidth={BORDER_WIDTH} fill="none" />
            <AnimatedCircle cx={cx} cy={cy} r={RADIUS} stroke="#EF4444" strokeWidth={BORDER_WIDTH} fill="none"
              strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} animatedProps={ringAnimatedProps}
              rotation="-90" origin={`${cx}, ${cy}`} />
          </Svg>
        )}
        <Animated.View style={[styles.cameraWrapper, borderAnimatedStyle]}>
          {isCameraActive && (
            <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />
          )}
          <View style={styles.dragHandle} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
  },
  cameraWrapper: {
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: BORDER_WIDTH,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  camera: { width: '100%', height: '100%' },
  dragHandle: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
