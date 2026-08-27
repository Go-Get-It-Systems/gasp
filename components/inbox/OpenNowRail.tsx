import { Camera, Flame, RefreshCcw } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { SectionHeader } from './SectionHeader';
import { OpenNowItem } from './OpenNowItem';

interface OpenNowRailProps {
  gasps: Gasp[];
  isLoading: boolean;
  isError: boolean;
  loadingId: string | null;
  onOpen: (gasp: Gasp) => void;
  onCapture: () => void;
  onRetry: () => void;
}

export function OpenNowRail({ gasps, isLoading, isError, loadingId, onOpen, onCapture, onRetry }: OpenNowRailProps) {
  const { t } = useTranslation();

  return (
    <View>
      <SectionHeader
        icon={<Flame size={16} color={colors.accentPink} />}
        title={t('gasps.pulse.openNow')}
        count={gasps.length}
        badgeColor={colors.accentPink}
      />
      {isLoading && gasps.length === 0 ? (
        <View style={styles.skeletonRow}>
          <Skeleton width={154} height={204} borderRadius={24} />
          <Skeleton width={154} height={204} borderRadius={24} />
        </View>
      ) : isError && gasps.length === 0 ? (
        <Pressable onPress={onRetry} style={styles.stateCard} accessibilityRole="button" accessibilityLabel={t('common.tryAgain')}>
          <RefreshCcw size={20} color={colors.error} />
          <Text variant="body" weight="600">{t('gasps.pulse.couldNotLoad')}</Text>
          <Text variant="caption">{t('common.tryAgain')}</Text>
        </Pressable>
      ) : gasps.length === 0 ? (
        <Pressable onPress={onCapture} style={styles.stateCard} accessibilityRole="button" accessibilityLabel={t('gasps.pulse.capture')}>
          <View style={styles.cameraIcon}><Camera size={22} color="#FFFFFF" /></View>
          <View style={styles.stateCopy}>
            <Text variant="body" weight="700">{t('gasps.pulse.openEmptyTitle')}</Text>
            <Text variant="caption" style={styles.stateSubtitle}>{t('gasps.pulse.openEmptyBody')}</Text>
          </View>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {gasps.map((gasp) => (
            <OpenNowItem
              key={gasp.id}
              gasp={gasp}
              featured={gasps.length === 1}
              isLoading={loadingId === gasp.id}
              onPress={onOpen}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: 20, gap: 12 },
  skeletonRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  stateCard: {
    marginHorizontal: 20,
    minHeight: 92,
    borderRadius: 22,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  stateCopy: { flex: 1, gap: 2 },
  stateSubtitle: { color: colors.textSecondary },
});
