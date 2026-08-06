import { StyleSheet, View, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Camera } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface InboxHeaderProps {
  onCameraPress?: () => void;
  title?: string;
  cameraAccessibilityLabel?: string;
}

export function InboxHeader({
  onCameraPress,
  title = 'INBOX',
  cameraAccessibilityLabel = 'Open camera',
}: InboxHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      <Pressable
        onPress={onCameraPress}
        style={styles.cameraButton}
        accessibilityRole="button"
        accessibilityLabel={cameraAccessibilityLabel}
      >
        <Camera size={24} color={colors.textPrimary} />
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
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
});
