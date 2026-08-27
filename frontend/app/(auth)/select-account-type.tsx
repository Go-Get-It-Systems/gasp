import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { router, useLocalSearchParams } from 'expo-router';
import { Building2, User } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AccountType = 'personal' | 'business';

interface AccountTypeOption {
  type: AccountType;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function SelectAccountTypeScreen() {
  const insets = useSafeAreaInsets();
  const { firebaseToken, phoneNumber } = useLocalSearchParams<{
    firebaseToken: string;
    phoneNumber: string;
  }>();

  const [selected, setSelected] = useState<AccountType | null>(null);

  const options: AccountTypeOption[] = [
    {
      type: 'personal',
      icon: <User size={28} color={selected === 'personal' ? colors.primary : colors.textSecondary} />,
      title: 'Conta pessoal',
      description: 'Para uso individual',
    },
    {
      type: 'business',
      icon: <Building2 size={28} color={selected === 'business' ? colors.primary : colors.textSecondary} />,
      title: 'Para empresas e equipes',
      description: 'Crie campanhas e alcance seu público',
    },
  ];

  const handleContinue = () => {
    if (!selected) return;

    router.push({
      pathname: '/(auth)/create-profile',
      params: {
        firebaseToken: firebaseToken ?? '',
        phoneNumber: phoneNumber ?? '',
        accountType: selected,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Animated.View
        entering={FadeInDown.duration(500).delay(100)}
        style={styles.content}
      >
        <Animated.View entering={FadeIn.duration(400).delay(200)}>
          <Text variant="title" style={styles.title}>
            {'Como você vai usar o GASP?'}
          </Text>
          <Text variant="body" style={styles.subtitle}>
            {'Escolha o tipo de conta para personalizar sua experiência'}
          </Text>
        </Animated.View>

        <View style={styles.options}>
          {options.map((option, index) => {
            const isSelected = selected === option.type;
            return (
              <Animated.View
                key={option.type}
                entering={FadeInDown.duration(500).delay(300 + index * 100)}
              >
                <Pressable
                  onPress={() => setSelected(option.type)}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrapper,
                      isSelected && styles.iconWrapperSelected,
                    ]}
                  >
                    {option.icon}
                  </View>

                  <View style={styles.optionText}>
                    <Text
                      variant="body"
                      style={[
                        styles.optionTitle,
                        isSelected && styles.optionTitleSelected,
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text variant="caption" style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>

                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={FadeInDown.duration(500).delay(550)}>
          <Pressable
            onPress={handleContinue}
            disabled={!selected}
            style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          >
            <Text variant="body" style={styles.continueText}>
              {'Continuar'}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionTitleSelected: {
    color: colors.primaryLight,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
