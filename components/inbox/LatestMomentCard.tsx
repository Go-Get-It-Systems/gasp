import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCheck, Clock3, Send, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { LatestMoment } from '@/services/api/schemas/gasp.schema';
import { getPrivacySafeImageSource } from '@/services/socialPulse';
import { SectionHeader } from './SectionHeader';

interface LatestMomentCardProps {
  moment: LatestMoment | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function LatestMomentCard({ moment, isLoading, isError, onRetry }: LatestMomentCardProps) {
  const { t } = useTranslation();
  if (!isLoading && !isError && !moment) return null;

  return (
    <View>
      <SectionHeader
        icon={<Send size={16} color={colors.accentCyan} />}
        title={t('gasps.pulse.latestMoment')}
        count={0}
        badgeColor={colors.accentCyan}
      />
      {isLoading && !moment ? (
        <View style={styles.shell}><Skeleton width="100%" height={154} borderRadius={24} /></View>
      ) : isError && !moment ? (
        <View style={styles.errorCard}>
          <Text variant="body" weight="600">{t('gasps.pulse.momentError')}</Text>
          <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('common.tryAgain')}>
            <Text variant="caption" style={styles.retry}>{t('common.tryAgain')}</Text>
          </Pressable>
        </View>
      ) : moment ? <MomentContent moment={moment} /> : null}
    </View>
  );
}

function MomentContent({ moment }: { moment: LatestMoment }) {
  const { t } = useTranslation();
  const hoursLeft = Math.max(1, Math.ceil((new Date(moment.expiresAt).getTime() - Date.now()) / 3_600_000));

  return (
    <View style={styles.shell}>
      <View style={styles.card} accessibilityLabel={t('gasps.pulse.momentAccessibility', {
        recipients: moment.recipientCount,
        opened: moment.openedCount,
        reactions: moment.reactionCount,
      })}>
        {moment.mediaMetadata.blurhash ? (
          <Image source={getPrivacySafeImageSource(moment.mediaMetadata.blurhash)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#1E1640', '#15243E', '#11111D']} style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient colors={['rgba(10,10,15,0.48)', 'rgba(10,10,15,0.94)']} style={StyleSheet.absoluteFillObject} />

        <View style={styles.headingRow}>
          <View style={styles.sentIcon}><Sparkles size={18} color={colors.accentCyan} /></View>
          <Text variant="body" weight="700" style={styles.heading}>
            {t('gasps.pulse.sentTo', { count: moment.recipientCount })}
          </Text>
          <View style={styles.avatars}>
            {moment.identitySummaries.map((person, index) => (
              <View key={person.id} style={[styles.avatarWrap, { marginLeft: index === 0 ? 0 : -9, zIndex: 3 - index }]}>
                <Avatar uri={person.avatarUrl} size={30} initials={person.displayName} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <CheckCheck size={15} color={colors.success} />
            <Text variant="caption" style={styles.metricText}>{t('gasps.pulse.opened', { count: moment.openedCount })}</Text>
          </View>
          <View style={styles.metric}>
            <Sparkles size={14} color={colors.accentPink} />
            <Text variant="caption" style={styles.metricText}>{t('gasps.pulse.reactionCount', { count: moment.reactionCount })}</Text>
          </View>
          <View style={styles.metric}>
            <Clock3 size={14} color={moment.isExpired ? colors.textTertiary : colors.warning} />
            <Text variant="caption" style={styles.metricText}>
              {moment.isExpired ? t('gasps.pulse.expired') : t('gasps.pulse.expiresInHours', { count: hoursLeft })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { paddingHorizontal: 20 },
  card: {
    minHeight: 154,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.32)',
    backgroundColor: colors.surface,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sentIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,182,212,0.15)' },
  heading: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  avatars: { flexDirection: 'row', paddingLeft: 8 },
  avatarWrap: { borderWidth: 2, borderColor: colors.background, borderRadius: 17 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(10,10,15,0.62)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 13 },
  metricText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  errorCard: { marginHorizontal: 20, padding: 18, borderRadius: 20, backgroundColor: colors.surface, gap: 6 },
  retry: { color: colors.primaryLight, fontWeight: '700' },
});
