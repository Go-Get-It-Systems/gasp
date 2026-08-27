import { StyleSheet, Pressable } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface EffectsButtonProps {
  onPress?: () => void;
  isActive?: boolean;
}

export function EffectsButton({ onPress, isActive }: EffectsButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.container, isActive && styles.active]}>
      <Sparkles size={22} color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  active: {
    backgroundColor: colors.primary,
  },
});
