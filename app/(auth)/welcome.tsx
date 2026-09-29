import { StyleSheet, View, ScrollView, useWindowDimensions, Text as RNText } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { AuthButton } from '@/components/auth/AuthButton';
import { TermsFooter } from '@/components/auth/TermsFooter';
import { AnimatedFace } from '@/components/ui/AnimatedFace';
import { colors } from '@/constants/colors';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  // Responsive sizing
  const isSmallScreen = height < 700;
  const logoSize = Math.min(160, Math.max(110, height * 0.17));
  const titleSize = Math.min(48, Math.max(36, width * 0.12));
  const taglineSize = Math.min(17, Math.max(14, width * 0.04));

  const handlePhoneLogin = () => {
    router.push('/(auth)/phone-login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background glow */}
      <View style={styles.bgContainer}>
        <View style={styles.bgGlow} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: height - insets.top, paddingBottom: insets.bottom + 16 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Spacer top */}
        <View style={styles.spacer} />

        {/* Logo */}
        <Animated.View
          entering={FadeIn.duration(800).delay(200)}
          style={styles.logoWrapper}
        >
          <AnimatedFace size={logoSize} />
        </Animated.View>

        {/* App Name — uses raw RNText to avoid lineHeight clipping from Text component */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.titleWrapper}
        >
          <RNText
            style={[
              styles.appName,
              { fontSize: titleSize, lineHeight: titleSize * 1.3 },
            ]}
          >
            GASP
          </RNText>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(600)}
          style={styles.taglineWrapper}
        >
          <Text variant="body" style={[styles.tagline, { fontSize: taglineSize }]}>
            {'Real reactions. No filters.'}
          </Text>
        </Animated.View>

        {/* Spacer middle */}
        <View style={[styles.spacer, isSmallScreen && { flexGrow: 0.5 }]} />

        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <Animated.View
            entering={FadeInDown.duration(500).delay(800)}
            style={styles.buttonWrapper}
          >
            <AuthButton variant="phone" onPress={handlePhoneLogin} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(900)}
            style={styles.buttonWrapper}
          >
            <AuthButton variant="apple" onPress={() => {}} disabled />
          </Animated.View>
        </View>

        {/* Terms Footer */}
        <Animated.View
          entering={FadeIn.duration(500).delay(1200)}
          style={styles.footer}
        >
          <TermsFooter />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  bgGlow: {
    width: 300,
    height: 300,
    borderRadius: 150,
    // @ts-ignore
    experimental_backgroundImage:
      'radial-gradient(circle, rgba(124, 58, 237, 0.12), rgba(236, 72, 153, 0.06), transparent 70%)',
  },
  scrollContent: {
    flexGrow: 1,
  },
  spacer: {
    flexGrow: 1,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWrapper: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 8,
  },
  appName: {
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 4,
    textAlign: 'center',
  },
  taglineWrapper: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  authSection: {
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 16,
  },
  buttonWrapper: {
    width: '100%',
  },
  footer: {
    paddingTop: 24,
  },
});
