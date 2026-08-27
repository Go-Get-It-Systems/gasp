import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { AlignLeft, AlignCenter, AlignRight, Minus, Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { FontFamily, BgMode, TextAlign } from './DraggableText';

const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 48;
const FONT_SIZE_STEP = 4;

interface TextStylePickerProps {
  font: FontFamily;
  color: string;
  bgMode: BgMode;
  align: TextAlign;
  fontSize: number;
  onChangeFont: (font: FontFamily) => void;
  onChangeColor: (color: string) => void;
  onToggleBg: () => void;
  onToggleAlign: () => void;
  onChangeFontSize: (size: number) => void;
  onDone: () => void;
}

const FONTS: { key: FontFamily; label: string }[] = [
  { key: 'modern', label: 'Modern' },
  { key: 'classic', label: 'Classic' },
  { key: 'bold', label: 'Bold' },
  { key: 'mono', label: 'Mono' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#EF4444', '#F97316', '#FBBF24',
  '#22C55E', '#3B82F6', '#7C3AED', '#EC4899', '#06B6D4',
];

const ALIGN_ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight };

export function TextStylePicker({
  font,
  color,
  bgMode,
  align,
  fontSize,
  onChangeFont,
  onChangeColor,
  onToggleBg,
  onToggleAlign,
  onChangeFontSize,
  onDone,
}: TextStylePickerProps) {
  const AlignIcon = ALIGN_ICONS[align];
  const canDecrease = fontSize > MIN_FONT_SIZE;
  const canIncrease = fontSize < MAX_FONT_SIZE;

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      style={styles.container}
    >
      {/* ── Font strip ───────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fontStrip}
      >
        {FONTS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => onChangeFont(f.key)}
            style={[styles.fontTab, font === f.key && styles.fontTabActive]}
            accessibilityLabel={`${f.label} font`}
            accessibilityRole="button"
          >
            <Text
              variant="caption"
              style={[styles.fontLabel, font === f.key && styles.fontLabelActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Size row ─────────────────────────────────────────────── */}
      <View style={styles.sizeRow}>
        <Pressable
          onPress={() => canDecrease && onChangeFontSize(fontSize - FONT_SIZE_STEP)}
          style={[styles.sizeButton, !canDecrease && styles.sizeButtonDisabled]}
          accessibilityLabel="Decrease font size"
          accessibilityRole="button"
        >
          <Minus size={16} color={canDecrease ? '#FFFFFF' : 'rgba(255,255,255,0.25)'} />
        </Pressable>

        <View style={styles.sizeTrack}>
          <View
            style={[
              styles.sizeFill,
              { width: `${((fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%` },
            ]}
          />
        </View>

        <Pressable
          onPress={() => canIncrease && onChangeFontSize(fontSize + FONT_SIZE_STEP)}
          style={[styles.sizeButton, !canIncrease && styles.sizeButtonDisabled]}
          accessibilityLabel="Increase font size"
          accessibilityRole="button"
        >
          <Plus size={16} color={canIncrease ? '#FFFFFF' : 'rgba(255,255,255,0.25)'} />
        </Pressable>
      </View>

      {/* ── Tools row: colors + controls ──────────────────────────── */}
      <View style={styles.toolsRow}>
        {/* Alignment */}
        <Pressable onPress={onToggleAlign} style={styles.toolButton} accessibilityLabel="Toggle alignment" accessibilityRole="button">
          <AlignIcon size={18} color="#FFFFFF" />
        </Pressable>

        {/* Color swatches */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorStrip}
        >
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => onChangeColor(c)} accessibilityLabel={`Select color ${c}`} accessibilityRole="button">
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSwatchSelected,
                  c === '#FFFFFF' && styles.colorSwatchWhiteBorder,
                ]}
              />
            </Pressable>
          ))}
        </ScrollView>

        {/* Background toggle */}
        <Pressable onPress={onToggleBg} style={[styles.toolButton, bgMode !== 'none' && styles.toolButtonActive]} accessibilityLabel="Toggle text background" accessibilityRole="button">
          <Text variant="caption" style={styles.bgLabel}>A</Text>
        </Pressable>
      </View>

      {/* ── Done ─────────────────────────────────────────────────── */}
      <Pressable onPress={onDone} style={styles.doneButton} accessibilityLabel="Done" accessibilityRole="button">
        <Text variant="body" style={styles.doneText}>Done</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingTop: 12,
    paddingBottom: 28,
    zIndex: 20,
    gap: 12,
  },

  // ── Fonts ─────────────────────────────────────────────────────
  fontStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  fontTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fontTabActive: {
    backgroundColor: '#FFFFFF',
  },
  fontLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  fontLabelActive: {
    color: '#000000',
  },

  // ── Size row ──────────────────────────────────────────────────
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  sizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeButtonDisabled: {
    opacity: 0.4,
  },
  sizeTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  sizeFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },

  // ── Tools row ─────────────────────────────────────────────────
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    backgroundColor: colors.primary,
  },
  bgLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Colors ────────────────────────────────────────────────────
  colorStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchWhiteBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // ── Done ──────────────────────────────────────────────────────
  doneButton: {
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
