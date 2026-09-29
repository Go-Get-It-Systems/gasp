import { useState } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { ChevronDown } from 'lucide-react-native';
import type { Country } from '@/constants/countryCodes';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  country: Country;
  onCountryPress: () => void;
}

export function PhoneInput({
  value,
  onChangeText,
  country,
  onCountryPress,
}: PhoneInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        isFocused ? styles.containerFocused : null,
      ]}
    >
      <Pressable style={styles.countryCode} onPress={onCountryPress}>
        <Text style={styles.flag}>{country.flag}</Text>
        <Text variant="body" style={styles.codeText}>
          {country.code}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </Pressable>
      <View style={styles.divider} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Phone number"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        autoFocus
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    height: 56,
    paddingHorizontal: 16,
  },
  containerFocused: {
    borderColor: colors.primary,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  codeText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
