import { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/services/api';
import { colors } from '@/constants/colors';

export default function CreateProfileScreen() {
  const insets = useSafeAreaInsets();
  const { firebaseToken, accountType } = useLocalSearchParams<{
    firebaseToken: string;
    phoneNumber: string;
    accountType: 'personal' | 'business';
  }>();
  const { register, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const isValid =
    displayName.trim().length >= 1 &&
    displayName.trim().length <= 50 &&
    username.trim().length >= 3 &&
    username.trim().length <= 30 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim());

  const handleCreate = async () => {
    if (!firebaseToken || !isValid || isLoading) return;

    try {
      await register({
        firebaseToken,
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        accountType: accountType ?? 'personal',
      });
      router.replace('/(tabs)/camera');
    } catch (error) {
      Alert.alert('Registration failed', getApiErrorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant="title" style={styles.title}>
          {'Create your profile'}
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {'Choose a name and username to get started'}
        </Text>

        <View style={styles.inputGroup}>
          <Text variant="label" style={styles.label}>
            {'Display Name'}
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text variant="label" style={styles.label}>
            {'Username'}
          </Text>
          <TextInput
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="your_username"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {username.length > 0 && username.length < 3 && (
            <Text variant="caption" style={styles.hint}>
              {'Username must be at least 3 characters'}
            </Text>
          )}
        </View>

        <Pressable
          onPress={handleCreate}
          disabled={!isValid || isLoading}
          style={[
            styles.createButton,
            (!isValid || isLoading) && styles.createButtonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text variant="body" style={styles.createText}>
              {"Let's go!"}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: colors.warning ?? colors.textTertiary,
  },
  createButton: {
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
