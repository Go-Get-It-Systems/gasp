import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
}

export function OtpInput({ length = 6, onComplete }: OtpInputProps) {
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    setCode(cleaned);
    if (cleaned.length === length) {
      onComplete(cleaned);
    }
  };

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.boxesContainer}>
        {Array.from({ length }).map((_, index) => {
          const isFilled = index < code.length;
          const isActive = index === code.length;

          return (
            <View
              key={index}
              style={[
                styles.box,
                isFilled ? styles.boxFilled : null,
                isActive ? styles.boxActive : null,
              ]}
            >
              <Text variant="title" style={styles.digit}>
                {code[index] ?? ''}
              </Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={code}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  boxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  boxActive: {
    borderColor: colors.primaryLight,
    borderWidth: 2,
  },
  digit: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
});
