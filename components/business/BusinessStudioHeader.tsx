import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { router } from 'expo-router';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BusinessStudioHeaderProps {
  title: string;
  /** Show the back arrow. Default true. Pass false when used as a root tab (Studio). */
  showBack?: boolean;
  onSettingsPress?: () => void;
}

export function BusinessStudioHeader({ title, showBack = true, onSettingsPress }: BusinessStudioHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Back button — hidden when showBack is false; spacer keeps title centered */}
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title.toUpperCase()}
      </Text>

      <Pressable
        onPress={onSettingsPress}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Settings size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});
