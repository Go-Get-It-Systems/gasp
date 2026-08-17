import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useMyBusiness } from '@/hooks/queries/useBusinessStudio';
import { colors } from '@/constants/colors';
export default function WorkspaceScreen() { const insets = useSafeAreaInsets(); const { data } = useMyBusiness(); return <View style={[styles.page, { paddingTop: insets.top + 24 }]}><Text variant="title" style={styles.title}>{data?.displayName ?? 'Workspace'}</Text><Text variant="body" style={styles.muted}>@{data?.handle} · {data?.role ?? 'owner'}</Text><View style={styles.spacer} /><Button variant="outline" onPress={() => router.replace('/(tabs)/profile')}>Exit Business Studio</Button></View>; }
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 20 }, title: { color: colors.textPrimary }, muted: { color: colors.textSecondary, marginTop: 8 }, spacer: { flex: 1 } });
