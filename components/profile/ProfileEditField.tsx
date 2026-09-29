import { TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface ProfileEditFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  maxLength: number;
  autoCapitalize?: 'none' | 'words';
  multiline?: boolean;
  accessibilityHint?: string;
}

export function ProfileEditField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  maxLength,
  autoCapitalize = 'none',
  multiline = false,
  accessibilityHint,
}: ProfileEditFieldProps) {
  return (
    <View className="gap-2">
      <Text variant="label" weight="600" className="uppercase tracking-wide">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-white"
        style={multiline ? { minHeight: 104, textAlignVertical: 'top' } : undefined}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {error ? <Text variant="caption" color={colors.error}>{error}</Text> : null}
    </View>
  );
}
