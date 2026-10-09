import { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { getAuth, signInWithPhoneNumber, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Text } from '@/components/ui/Text';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { colors } from '@/constants/colors';
import {
  countries,
  getDeviceDefaultCountry,
  type Country,
} from '@/constants/countryCodes';

export default function PhoneLoginScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [country, setCountry] = useState<Country>(getDeviceDefaultCountry);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);

  const filteredCountries = search
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search) ||
          c.iso.toLowerCase().includes(search.toLowerCase()),
      )
    : countries;

  const handleSelectCountry = (selected: Country) => {
    setCountry(selected);
    setShowPicker(false);
    setSearch('');
  };

  const handleContinue = async () => {
    if (phone.length < 8 || isSending) return;

    const formattedPhone = `${country.code}${phone.replace(/\D/g, '')}`;

    setIsSending(true);
    try {
      // On real devices: Play Integrity handles verification invisibly (no reCAPTCHA)
      // On emulators: Play Integrity is unavailable, so we don't force reCAPTCHA either —
      // use a Firebase test phone number instead (configured in Firebase Console)
      const firebaseAuth = getAuth();
      firebaseAuth.settings.forceRecaptchaFlowForTesting = false;

      const confirmation = await signInWithPhoneNumber(firebaseAuth, formattedPhone);
      confirmationRef.current = confirmation;
      router.push({
        pathname: '/(auth)/verify-code',
        params: {
          phoneNumber: formattedPhone,
          verificationId: confirmation.verificationId,
        },
      });
    } catch (error: unknown) {
      const code = (error as { code?: string } | null)?.code ?? '';
      const message =
        code === 'auth/invalid-phone-number'
          ? 'Invalid phone number. Please check and try again.'
          : code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : code === 'auth/missing-client-identifier'
              ? 'App verification failed. Please try again.'
              : 'Could not send verification code. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSending(false);
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <Pressable
      style={[
        styles.countryItem,
        item.iso === country.iso ? styles.countryItemSelected : null,
      ]}
      onPress={() => handleSelectCountry(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text variant="body" style={styles.countryName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text variant="body" style={styles.countryCode}>
        {item.code}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.content}>
        <Text variant="title" style={styles.title}>
          {"What's your number?"}
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {"We'll send you a verification code"}
        </Text>

        <View style={styles.inputContainer}>
          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            country={country}
            onCountryPress={() => setShowPicker(true)}
          />
        </View>

        <Pressable
          onPress={handleContinue}
          style={[
            styles.continueButton,
            phone.length < 8 || isSending
              ? styles.continueButtonDisabled
              : null,
          ]}
          disabled={phone.length < 8 || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text variant="body" style={styles.continueText}>
              {'Continue'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPicker(false);
          setSearch('');
        }}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text variant="title" style={styles.modalTitle}>
              {'Select country'}
            </Text>
            <Pressable
              onPress={() => {
                setShowPicker(false);
                setSearch('');
              }}
              style={styles.closeButton}
            >
              <X size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code..."
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.iso}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
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
    marginBottom: 12,
  },
  inputContainer: {
    marginVertical: 8,
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 12,
  },
  countryItemSelected: {
    backgroundColor: colors.surface,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  countryCode: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
