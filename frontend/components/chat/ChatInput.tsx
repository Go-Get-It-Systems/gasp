import { useState } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { Send, Camera, Image as ImageIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui/IconButton';
import { colors } from '@/constants/colors';

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const handleCamera = () => {
    // Usually routes to a camera screen adapted for direct message
    router.push('/(tabs)/camera');
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <IconButton
        icon={<Camera size={24} color={colors.textSecondary} />}
        variant="ghost"
        onPress={handleCamera}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          accessibilityLabel="Message input"
          accessibilityHint="Type a message"
        />
      </View>
      <IconButton
        icon={<Send size={20} color={text.trim() ? colors.textPrimary : colors.textSecondary} />}
        variant={text.trim() ? 'filled' : 'default'}
        disabled={!text.trim() || isLoading}
        onPress={handleSend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
