import { StyleSheet, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';

export type FontFamily = 'modern' | 'classic' | 'bold' | 'mono';
export type BgMode = 'none' | 'dark' | 'light';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextConfig {
  font: FontFamily;
  color: string;
  bgMode: BgMode;
  align: TextAlign;
  fontSize: number;
}

const FONT_MAP: Record<FontFamily, { fontFamily?: string; fontWeight: '400' | '700' | '900' }> = {
  modern: { fontWeight: '700' },
  classic: { fontFamily: 'serif', fontWeight: '400' },
  bold: { fontWeight: '900' },
  mono: { fontFamily: 'monospace', fontWeight: '400' },
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TRASH_ZONE_Y = SCREEN_HEIGHT - 140;

export interface TextPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface DraggableTextProps {
  text: string;
  config: TextConfig;
  onTap?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (droppedInTrash: boolean) => void;
  onDragOverTrash?: (isOver: boolean) => void;
  onPositionChange?: (pos: TextPosition) => void;
}

export function DraggableText({
  text,
  config,
  onTap,
  onPositionChange,
  onDragStart,
  onDragEnd,
  onDragOverTrash,
}: DraggableTextProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);
  const isOverTrash = useSharedValue(false);

  const reportPos = (x: number, y: number, s: number, r: number) => {
    // Normalize to -1..1 range relative to half-screen so position is proportional across devices
    onPositionChange?.({
      x: x / (SCREEN_WIDTH / 2),
      y: y / (SCREEN_HEIGHT / 2),
      scale: s,
      rotation: r,
    });
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      if (onDragStart) runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;

      const over = e.absoluteY > TRASH_ZONE_Y;
      if (over !== isOverTrash.value) {
        isOverTrash.value = over;
        if (onDragOverTrash) runOnJS(onDragOverTrash)(over);
      }
    })
    .onEnd((e) => {
      const droppedInTrash = e.absoluteY > TRASH_ZONE_Y;
      if (onDragEnd) runOnJS(onDragEnd)(droppedInTrash);
      if (!droppedInTrash) {
        runOnJS(reportPos)(translateX.value, translateY.value, scale.value, rotation.value);
      }
      if (droppedInTrash) {
        // Reset position for next text
        translateX.value = 0;
        translateY.value = 0;
        scale.value = 1;
        rotation.value = 0;
      }
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      if (onDragStart) runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.3), 4);
    })
    .onEnd(() => {
      if (scale.value < 0.5) scale.value = withSpring(0.5);
      if (onDragEnd) runOnJS(onDragEnd)(false);
      runOnJS(reportPos)(translateX.value, translateY.value, scale.value, rotation.value);
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    });

  const tap = Gesture.Tap().onEnd(() => {
    'worklet';
    if (onTap) runOnJS(onTap)();
  });

  const composed = Gesture.Simultaneous(pan, pinch, rotate);
  const gesture = Gesture.Exclusive(composed, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const fontStyle = FONT_MAP[config.font];
  const textColor = config.bgMode === 'light' ? '#FFFFFF' : config.color;

  return (
    <View style={styles.positioner}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.draggable, animatedStyle]}>
          <View
            style={[
              styles.textWrapper,
              config.bgMode === 'dark' && styles.bgDark,
              config.bgMode === 'light' && [styles.bgLight, { backgroundColor: config.color }],
            ]}
          >
            <Text
              variant="body"
              style={[
                styles.text,
                {
                  fontSize: config.fontSize,
                  lineHeight: config.fontSize * 1.3,
                  color: textColor,
                  fontWeight: fontStyle.fontWeight,
                  fontFamily: fontStyle.fontFamily,
                  textAlign: config.align,
                },
                config.bgMode === 'none' && styles.dropShadow,
              ]}
            >
              {text}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const bgBase = {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
  borderCurve: 'continuous' as const,
};

const styles = StyleSheet.create({
  positioner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draggable: {},
  textWrapper: {
    maxWidth: 300,
  },
  bgDark: {
    ...bgBase,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  bgLight: {
    ...bgBase,
  },
  text: {},
  dropShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
});
