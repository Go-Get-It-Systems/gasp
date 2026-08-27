import { StyleSheet, View, Pressable } from 'react-native';
import { Zap, ZapOff, SwitchCamera } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';

interface CameraControlsProps {
  flashMode: 'off' | 'on' | 'auto';
  onToggleFlash: () => void;
  onFlipCamera: () => void;
}

const FLASH_LABELS = { off: 'OFF', on: 'ON', auto: 'AUTO' } as const;

export function CameraControls({
  flashMode,
  onToggleFlash,
  onFlipCamera,
}: CameraControlsProps) {
  const FlashIcon = flashMode === 'off' ? ZapOff : Zap;
  const flashColor = flashMode === 'on' ? '#FBBF24' : '#FFFFFF';

  return (
    <View style={styles.container}>
      <Pressable onPress={onToggleFlash} style={styles.iconButton} accessibilityLabel="Toggle flash" accessibilityRole="button">
        <FlashIcon size={20} color={flashColor} />
        <Text style={[styles.label, flashMode === 'on' && styles.labelActive]}>
          {FLASH_LABELS[flashMode]}
        </Text>
      </Pressable>

      <Pressable onPress={onFlipCamera} style={styles.iconButton} accessibilityLabel="Flip camera" accessibilityRole="button">
        <SwitchCamera size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderCurve: 'continuous',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#FBBF24',
  },
});
