import { Camera } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface GaspsPulseHeaderProps {
  waitingCount: number;
  onCameraPress: () => void;
}

export function GaspsPulseHeader({ waitingCount, onCameraPress }: GaspsPulseHeaderProps) {
  const { t } = useTranslation();
  const summary = waitingCount > 0
    ? t('gasps.pulse.waiting', { count: waitingCount })
    : t('gasps.pulse.nothingWaiting');

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text variant="title" style={styles.title}>{t('gasps.pulse.title')}</Text>
        <Text variant="caption" style={styles.subtitle}>{summary}</Text>
      </View>
      <Pressable
        onPress={onCameraPress}
        style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('gasps.pulse.openCamera')}
      >
        <Camera size={22} color={colors.textPrimary} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  copy: { gap: 2 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  cameraButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
