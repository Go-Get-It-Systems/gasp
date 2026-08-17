import { View, Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { BarChart3, BriefcaseBusiness, Images, Megaphone } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

const tabs = [{ label: 'Overview', path: '/(business)', icon: BarChart3 }, { label: 'Campaigns', path: '/(business)/campaigns', icon: Megaphone }, { label: 'Reactions', path: '/(business)/reactions', icon: Images }, { label: 'Workspace', path: '/(business)/workspace', icon: BriefcaseBusiness }];
export function BusinessStudioTabBar() { const pathname = usePathname(); return <View style={styles.bar}>{tabs.map(({ label, path, icon: Icon }) => { const selected = path === '/(business)' ? pathname === '/' : pathname.includes(path.split('/').pop()!); return <Pressable key={label} onPress={() => router.replace(path as never)} style={styles.item} accessibilityLabel={label} accessibilityRole="tab" accessibilityState={{ selected }}><Icon size={20} color={selected ? colors.primary : colors.textTertiary} /><Text variant="caption" style={[styles.label, selected && styles.selected]}>{label}</Text></Pressable>; })}</View>; }
const styles = StyleSheet.create({ bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 10 }, item: { flex: 1, alignItems: 'center', gap: 4 }, label: { color: colors.textTertiary, fontSize: 10 }, selected: { color: colors.primary } });
