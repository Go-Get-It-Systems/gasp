import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  type SharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionHaptic } from '@/utils/haptics';
import { PIP_WIDTH, PIP_HEIGHT, MARGIN } from './pipPosition';

const STORAGE_KEY = '@gasp/reaction-pip-corner';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRING_CFG = { damping: 15, stiffness: 200, mass: 0.8 };
const BORDER_WIDTH = 2.5;

// view-gasp places its close/report buttons (40pt) at insets.top + 12, so the
// top corners start below them instead of covering them.
const TOP_CONTROLS_HEIGHT = 12 + 40 + MARGIN;

export function buildPipCorners(topInset: number) {
  const top = topInset + TOP_CONTROLS_HEIGHT;
  const bottom = SCREEN_HEIGHT - PIP_HEIGHT - MARGIN - 100;
  return [
    { x: MARGIN, y: top },
    { x: SCREEN_WIDTH - PIP_WIDTH - MARGIN, y: top },
    { x: MARGIN, y: bottom },
    { x: SCREEN_WIDTH - PIP_WIDTH - MARGIN, y: bottom },
  ];
}

const DEFAULT_CORNER = 1;

async function loadCorner(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const idx = raw !== null ? parseInt(raw, 10) : DEFAULT_CORNER;
  return isNaN(idx) || idx < 0 || idx > 3 ? DEFAULT_CORNER : idx;
}

function persistCorner(idx: number) {
  AsyncStorage.setItem(STORAGE_KEY, String(idx)).catch(() => {});
}

interface ReactionCaptureProps {
  isActive: SharedValue<number>;
  isVisible?: boolean;
  isRecording?: boolean;
  cameraRef?: React.RefObject<CameraView | null>;
  onCornerChange?: (cornerIndex: number) => void;
  onCameraReady?: () => void;
}

export function ReactionCapture({
  isActive,
  isVisible = false,
  isRecording = false,
  cameraRef,
  onCornerChange,
  onCameraReady,
}: ReactionCaptureProps) {
  const insets = useSafeAreaInsets();
  const corners = useMemo(() => buildPipCorners(insets.top), [insets.top]);
  const minY = corners[0].y;
  const translateX = useSharedValue(corners[DEFAULT_CORNER].x);
  const translateY = useSharedValue(corners[DEFAULT_CORNER].y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const recordingScale = useSharedValue(1);

  // Restored from main: mount/unmount based on isActive to manage AVCapture session
  const [isCameraActive, setIsCameraActive] = useState(false);

  // 1 while recording: the frame border turns red (the only REC cue on the camera).
  const recordingTint = useSharedValue(0);

  useEffect(() => {
    loadCorner().then((idx) => {
      translateX.value = corners[idx].x;
      translateY.value = corners[idx].y;
    });
  }, [corners, translateX, translateY]);

  // Spring entry + red border on recording start
  useEffect(() => {
    if (isRecording) {
      recordingScale.value = 0.85;
      recordingScale.value = withSpring(1, SPRING_CFG);
      recordingTint.value = withTiming(1, { duration: 200 });
    } else {
      recordingTint.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, recordingScale, recordingTint]);

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
    for (let i = 0; i < corners.length; i++) {
      const d = Math.hypot(corners[i].x - x, corners[i].y - y);
      if (d < nearestD) { nearestD = d; nearestIdx = i; }
    }
    translateX.value = withSpring(corners[nearestIdx].x, SPRING_CFG);
    translateY.value = withSpring(corners[nearestIdx].y, SPRING_CFG);
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
      translateY.value = Math.max(minY, Math.min(SCREEN_HEIGHT - PIP_HEIGHT - MARGIN, startY.value + e.translationY));
    })
    .onEnd(() => {
      snapToNearestCorner(translateX.value, translateY.value);
    });

  const isVisibleSV = useSharedValue(isVisible ? 1 : 0);
  useEffect(() => { isVisibleSV.value = isVisible ? 1 : 0; }, [isVisible, isVisibleSV]);

  const animatedStyle = useAnimatedStyle(() => {
    const visible = isVisibleSV.get();
    const active = isActive.get();
    // Hidden until the hold starts: an empty camera frame before then reads as
    // an unexplained box. It pops in with the live camera when holding.
    const opacity = visible === 0 ? 0 : interpolate(active, [0, 1], [0, 1]);
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

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: recordingTint.get() > 0.5 ? '#EF4444' : 'rgba(255,255,255,0.4)',
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Animated.View style={[styles.cameraWrapper, borderAnimatedStyle]}>
          {isCameraActive && (
            <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video"
              onCameraReady={onCameraReady} />
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
