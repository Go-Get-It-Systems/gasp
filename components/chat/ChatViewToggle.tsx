import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

export type ChatView = 'chats' | 'friends';

interface ChatViewToggleProps {
  value: ChatView;
  onChange: (value: ChatView) => void;
}

export function ChatViewToggle({ value, onChange }: ChatViewToggleProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {(['chats', 'friends'] as const).map((view) => {
        const selected = value === view;
        const label = t(`chat.inbox.${view}`);
        return (
          <Pressable
            key={view}
            onPress={() => onChange(view)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <Text variant="caption" style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 2,
    padding: 3,
    gap: 3,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  tab: {
    minWidth: 82,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 9,
    borderCurve: 'continuous',
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
