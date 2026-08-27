import { RefreshCcw, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ReactionReturn } from '@/services/api/schemas/gasp.schema';
import { ReactionReturnItem } from './ReactionReturnItem';
import { SectionHeader } from './SectionHeader';

interface ReactionReturnSectionProps {
  reactions: ReactionReturn[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}

const INITIAL_REACTION_COUNT = 4;

export function ReactionReturnSection({ reactions, isLoading, isError, hasMore, isLoadingMore, onRetry, onLoadMore }: ReactionReturnSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  if (!isLoading && !isError && reactions.length === 0) return null;

  const hasHiddenReactions = reactions.length > INITIAL_REACTION_COUNT;
  const visibleReactions = isExpanded ? reactions : reactions.slice(0, INITIAL_REACTION_COUNT);

  return (
    <View style={styles.section}>
      <SectionHeader
        icon={<Sparkles size={16} color={colors.accentPink} />}
        title={t('gasps.pulse.reactionsForYou')}
        count={reactions.length}
        badgeColor={colors.accentPink}
      />
      {isLoading && reactions.length === 0 ? (
        <View style={styles.skeletons}>
          <Skeleton width="100%" height={72} borderRadius={20} />
          <Skeleton width="100%" height={72} borderRadius={20} />
        </View>
      ) : isError && reactions.length === 0 ? (
        <Pressable onPress={onRetry} style={styles.error} accessibilityRole="button" accessibilityLabel={t('common.tryAgain')}>
          <RefreshCcw size={18} color={colors.error} />
          <Text variant="caption">{t('gasps.pulse.reactionsError')}</Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {visibleReactions.map((reaction) => <ReactionReturnItem key={reaction.id} reaction={reaction} />)}
          {hasHiddenReactions ? (
            <Pressable
              onPress={() => setIsExpanded((value) => !value)}
              style={styles.more}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? t('gasps.pulse.showFewerReactions') : t('gasps.pulse.showAllReactions', { count: reactions.length })}
            >
              <Text variant="caption" weight="700" style={styles.moreText}>
                {isExpanded ? t('gasps.pulse.showFewerReactions') : t('gasps.pulse.showAllReactions', { count: reactions.length })}
              </Text>
            </Pressable>
          ) : null}
          {(!hasHiddenReactions || isExpanded) && hasMore ? (
            <Pressable onPress={onLoadMore} disabled={isLoadingMore} style={styles.more} accessibilityRole="button" accessibilityLabel={t('gasps.pulse.loadMore')}>
              {isLoadingMore ? <ActivityIndicator size="small" color={colors.primaryLight} /> : <Text variant="caption" weight="700" style={styles.moreText}>{t('gasps.pulse.loadMore')}</Text>}
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%' },
  list: { width: '100%', gap: 8 },
  skeletons: { marginHorizontal: 20, gap: 8 },
  error: { marginHorizontal: 20, minHeight: 72, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface },
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.primaryLight },
});
