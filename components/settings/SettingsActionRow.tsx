import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface SettingsActionRowProps {
  title: string;
  subtitle?: string;
  accessibilityLabel: string;
  onPress: () => void;
  icon?: ReactNode;
}

export function SettingsActionRow({ title, subtitle, accessibilityLabel, onPress, icon }: SettingsActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {icon ? <View>{icon}</View> : null}
      <View className="flex-1 gap-1">
        <Text variant="body" weight="600">{title}</Text>
        {subtitle ? <Text variant="caption" color={colors.textSecondary}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={20} color={colors.borderLight} />
    </Pressable>
  );
}
