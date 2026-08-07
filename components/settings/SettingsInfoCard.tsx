import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface SettingsInfoCardProps {
  title: string;
  body: string;
}

export function SettingsInfoCard({ title, body }: SettingsInfoCardProps) {
  return (
    <View className="gap-2 rounded-2xl border border-border bg-surface px-4 py-4">
      <Text variant="body" weight="600">{title}</Text>
      <Text variant="caption" color={colors.textSecondary}>{body}</Text>
    </View>
  );
}
