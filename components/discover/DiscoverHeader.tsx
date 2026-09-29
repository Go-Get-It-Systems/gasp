import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

export function DiscoverHeader() {
  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.title}>
        {'DISCOVER'}
      </Text>
      <Text variant="caption" style={styles.subtitle}>
        {'See what the world is gasping about'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
