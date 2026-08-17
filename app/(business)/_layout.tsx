import { Stack, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BusinessStudioTabBar } from '@/components/navigation/BusinessStudioTabBar';
import { useMyBusiness } from '@/hooks/queries/useBusinessStudio';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

export default function BusinessLayout() { const { data, isLoading } = useMyBusiness(); if (!isLoading && !data) return <View style={styles.unavailable}><Text variant="title" style={styles.text}>Business Studio is unavailable</Text><Text variant="body" style={styles.text}>Your account does not have an active Studio workspace.</Text></View>; return <ErrorBoundary compact onGoHome={() => router.replace('/(tabs)/profile')}><View style={styles.container}><Stack screenOptions={{ headerShown: false }} /><BusinessStudioTabBar /></View></ErrorBoundary>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background, gap: 10 }, text: { color: colors.textSecondary, textAlign: 'center' } });
