import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { clearPhoneVerifier, confirmPhoneVerification, requestPhoneVerification } from '@/services/firebaseAuth';
import { getPhoneAuthErrorMessage } from '@/utils/firebaseAuthErrors';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { OtpInput } from '@/components/auth/OtpInput';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/services/api';
import { colors } from '@/constants/colors';

const RESEND_COOLDOWN_S = 30;

export default function VerifyCodeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    phoneNumber: string;
    verificationId: string;
  }>();
  const { phoneNumber } = params;
  const { login } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);
  // A resend issues a new verificationId; codes from the old one stop working.
  const [verificationId, setVerificationId] = useState(params.verificationId);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_S);
  const [isResending, setIsResending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => clearPhoneVerifier, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!phoneNumber || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setVerificationError(null);
    try {
      const confirmation = await requestPhoneVerification(phoneNumber, true);
      if (confirmation.verificationId) setVerificationId(confirmation.verificationId);
      setResendCooldown(RESEND_COOLDOWN_S);
      if (Platform.OS !== 'web') Alert.alert(t('auth.codeResentTitle'), t('auth.codeResentBody', { phone: phoneNumber }));
    } catch (error: unknown) {
      Sentry.captureException(error, { extra: { context: 'verify-code.resend' } });
      const message = getPhoneAuthErrorMessage(error, t('auth.couldNotSendCode'));
      setVerificationError(message);
      if (Platform.OS !== 'web') Alert.alert(t('common.error'), message);
    } finally {
      setIsResending(false);
    }
  };

  const handleComplete = async (code: string) => {
    if (!verificationId || isVerifying) return;

    setIsVerifying(true);
    setVerificationError(null);
    try {
      const firebaseToken = await confirmPhoneVerification(verificationId, code);

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
            params: { phoneNumber },
          });
        } else {
          const message = getApiErrorMessage(error);
          setVerificationError(message);
          if (Platform.OS !== 'web') Alert.alert('Login failed', message);
        }
      }
    } catch (error: unknown) {
      const message = getPhoneAuthErrorMessage(error, 'Verification failed. Please try again.');
      setVerificationError(message);
      if (Platform.OS !== 'web') Alert.alert('Error', message);
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

        {verificationError && <Text accessibilityRole="alert" style={styles.errorText}>{verificationError}</Text>}

        <Pressable
          style={styles.resendButton}
          onPress={handleResend}
          disabled={resendCooldown > 0 || isResending}
          accessibilityRole="button"
          accessibilityLabel={resendCooldown > 0
            ? t('auth.resendIn', { seconds: resendCooldown })
            : t('auth.resend')}
          accessibilityState={{ disabled: resendCooldown > 0 || isResending }}
        >
          <Text variant="body" style={styles.resendText}>
            {t('auth.didntGetCode')}
            <Text variant="body" style={resendCooldown > 0 ? styles.resendDisabled : styles.resendLink}>
              {resendCooldown > 0 ? t('auth.resendIn', { seconds: resendCooldown }) : t('auth.resend')}
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
  errorText: {
    color: colors.error,
    fontSize: 14,
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
  resendDisabled: {
    color: colors.textTertiary,
    fontWeight: '600',
  },
});
