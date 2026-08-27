import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { TextStylePicker } from '@/components/camera/TextStylePicker';
import type { FontFamily } from '@/components/camera/DraggableText';
import type { UseTextOverlayReturn } from '@/hooks/useTextOverlay';

/** Blinking cursor for live text preview */
function BlinkingCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 400 }),
      ),
      -1,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Reanimated.View style={[{ width: 2, height: 30, backgroundColor: color, borderRadius: 1 }, style]} />
  );
}

const FONT_MAP: Record<FontFamily, { fontFamily?: string; fontWeight: '400' | '700' | '900' }> = {
  modern: { fontWeight: '700' },
  classic: { fontFamily: 'serif', fontWeight: '400' },
  bold: { fontWeight: '900' },
  mono: { fontFamily: 'monospace', fontWeight: '400' },
};

interface TextEditOverlayProps {
  overlay: UseTextOverlayReturn;
}

export function TextEditOverlay({ overlay }: TextEditOverlayProps) {
  const { state, handlers, refs } = overlay;
  const { inputText, textConfig } = state;
  const {
    handleTextDone,
    setInputText,
    handleChangeFont,
    handleChangeColor,
    handleToggleBg,
    handleToggleAlign,
    handleChangeFontSize,
  } = handlers;
  const { inputRef } = refs;

  const liveText = inputText.trim();
  const liveFont = FONT_MAP[textConfig.font] ?? FONT_MAP.modern!;

  return (
    <KeyboardAvoidingView
      style={styles.textEditOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.textEditBg} onPress={handleTextDone}>
        {/* Live preview with blinking cursor */}
        <View style={styles.livePreview} pointerEvents="none">
          <View
            style={[
              styles.liveTextRow,
              textConfig.bgMode === 'dark' && styles.liveBgDark,
              textConfig.bgMode === 'light' && [styles.liveBgLight, { backgroundColor: textConfig.color }],
            ]}
          >
            {liveText !== '' && (
              <Text
                variant="body"
                style={[
                  styles.liveText,
                  {
                    fontSize: textConfig.fontSize,
                    lineHeight: textConfig.fontSize * 1.3,
                    color: textConfig.bgMode === 'light' ? '#FFFFFF' : textConfig.color,
                    textAlign: textConfig.align,
                    fontWeight: liveFont.fontWeight,
                    fontFamily: liveFont.fontFamily,
                  },
                  textConfig.bgMode === 'none' && styles.liveTextShadow,
                ]}
              >
                {liveText}
              </Text>
            )}
            <BlinkingCursor color={textConfig.bgMode === 'light' ? '#FFFFFF' : textConfig.color} />
          </View>
        </View>
      </Pressable>

      {/* Hidden TextInput — captures keyboard, live preview shows the text */}
      <TextInput
        ref={inputRef}
        value={inputText}
        onChangeText={setInputText}
        style={styles.hiddenInput}
        maxLength={150}
        autoFocus
        caretHidden
      />

      {/* Style picker */}
      <TextStylePicker
        font={textConfig.font}
        color={textConfig.color}
        bgMode={textConfig.bgMode}
        align={textConfig.align}
        fontSize={textConfig.fontSize}
        onChangeFont={handleChangeFont}
        onChangeColor={handleChangeColor}
        onToggleBg={handleToggleBg}
        onToggleAlign={handleToggleAlign}
        onChangeFontSize={handleChangeFontSize}
        onDone={handleTextDone}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  textEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  textEditBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  livePreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  liveTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  liveText: {
    fontWeight: '700',
  },
  liveTextShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  liveBgDark: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  liveBgLight: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
  },
});
