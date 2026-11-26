import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StudioWorkspace } from '@/services/api/schemas/studio.schema';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { BusinessButton } from './BusinessUI';

export function StudioWorkspaceSelector({ workspaces, selectedId, onSelect, disabled }: {
  workspaces: StudioWorkspace[];
  selectedId?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (workspaces.length < 2) return null;
  return <View style={styles.container}>
    <Text style={styles.label}>{t('business.selectBusiness')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.options}>
      {workspaces.map((workspace) => <BusinessButton
        key={workspace.id} label={workspace.displayName}
        selected={workspace.id === selectedId} disabled={disabled}
        onPress={() => onSelect(workspace.id)}
      />)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 8 },
  label: { paddingHorizontal: 16, fontSize: 14, color: colors.textSecondary },
  options: { paddingHorizontal: 16, gap: 8 },
});
