import { OtpInput } from '@/components/auth/OtpInput';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { confirmCode } from '@/lib/phoneAuth';
import { getApiErrorMessage } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerifyCodeScreen() {
  const insets = useSafeAreaInsets();
  const { phoneNumber, verificationId } = useLocalSearchParams<{
    phoneNumber: string;
    verificationId: string;
  }>();
  const { login } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleComplete = async (code: string) => {
    if (!verificationId || isVerifying) return;

    setIsVerifying(true);
    try {
      // 1. Verify OTP with Firebase (works on both native and web via phoneAuth abstraction)
      const firebaseToken = await confirmCode(verificationId, code);

      // 2. Login with backend
      try {
        await login(firebaseToken);
        router.replace('/(tabs)/camera');
      } catch (error: any) {
        // If 401 with "not registered" → user needs to create profile
        const status = error?.response?.status;
        const msg = error?.response?.data?.message ?? '';
        console.log('[verify-code] Login error:', { status, msg });
        if (status === 401 && msg.toLowerCase().includes('not registered')) {
          console.log('[verify-code] Redirecting to select-account-type');
          router.replace({
            pathname: '/(auth)/select-account-type',
            params: { firebaseToken, phoneNumber: phoneNumber ?? '' },
          });
        } else {
          const errorMsg = getApiErrorMessage(error);
          console.log('[verify-code] Login failed:', errorMsg);
          if (Platform.OS === 'web') {
            window.alert('Login failed: ' + errorMsg);
          } else {
            Alert.alert('Login failed', errorMsg);
          }
        }
      }
    } catch (error: any) {
      const code = error?.code ?? '';
      const message =
        code === 'auth/invalid-verification-code'
          ? 'Invalid code. Please try again.'
          : code === 'auth/code-expired'
            ? 'Code expired. Please request a new one.'
            : 'Verification failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.content}>
        <Text variant="title" style={styles.title}>
          {'Enter the code'}
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {`We sent a 6-digit code to ${phoneNumber ?? 'your phone'}`}
        </Text>

        <View style={styles.otpContainer}>
          {isVerifying ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="body" style={styles.loadingText}>
                {'Verifying...'}
              </Text>
            </View>
          ) : (
            <OtpInput onComplete={handleComplete} />
          )}
        </View>

        <Pressable style={styles.resendButton}>
          <Text variant="body" style={styles.resendText}>
            {"Didn't receive a code? "}
            <Text variant="body" style={styles.resendLink}>
              {'Resend'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  otpContainer: {
    marginVertical: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
