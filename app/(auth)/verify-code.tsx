import { useState } from 'react';
import { isAxiosError } from 'axios';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { getAuth, signInWithCredential, PhoneAuthProvider, getIdToken } from '@react-native-firebase/auth';
import { Text } from '@/components/ui/Text';
import { OtpInput } from '@/components/auth/OtpInput';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/services/api';
import { colors } from '@/constants/colors';

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
      // 1. Verify OTP with Firebase (native SDK)
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await signInWithCredential(getAuth(), credential);
      const firebaseToken = await getIdToken(userCredential.user);

      // 2. Login with backend
      try {
        await login(firebaseToken);
        router.replace('/(tabs)/camera');
      } catch (error: unknown) {
        // If 401 with "not registered" → user needs to create profile
        const response = isAxiosError<{ message?: string }>(error) ? error.response : undefined;
        const status = response?.status;
        const msg = response?.data?.message ?? '';
        if (status === 401 && msg.toLowerCase().includes('not registered')) {
          router.replace({
            pathname: '/(auth)/create-profile',
            params: { firebaseToken, phoneNumber },
          });
        } else {
          Alert.alert('Login failed', getApiErrorMessage(error));
        }
      }
    } catch (error: unknown) {
      const code = (error as { code?: string } | null)?.code ?? '';
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
