import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { Campaign } from '@/services/api/business';
import { deleteCampaign, getCampaigns, publishCampaign } from '@/services/api/business';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Megaphone, Plus, RefreshCw, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── State badge ─────────────────────────────────────────────────────────

const STATE_COLORS: Record<Campaign['state'], string> = {
  draft: colors.textTertiary,
  publishing: colors.warning,
  live: colors.success,
  failed: colors.error,
  closed: colors.textMuted,
};

const STATE_LABELS: Record<Campaign['state'], string> = {
  draft: 'Draft',
  publishing: 'Publishing…',
  live: 'Live',
  failed: 'Failed',
  closed: 'Closed',
};

function CampaignRow({
  campaign,
  workspaceId,
  onPublish,
  onDelete,
}: {
  campaign: Campaign;
  workspaceId: string;
  onPublish: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}) {
  const stateColor = STATE_COLORS[campaign.state] ?? colors.textSecondary;
  const stateLabel = STATE_LABELS[campaign.state] ?? campaign.state;
  const canDelete = campaign.state !== 'publishing'; // publishing is the only truly locked state

  return (
    <View style={itemStyles.row}>
      <View style={itemStyles.top}>
        <Text style={itemStyles.title} numberOfLines={1}>
          {campaign.title}
        </Text>
        <View style={itemStyles.topRight}>
          <View style={[itemStyles.badge, { borderColor: stateColor + '40' }]}>
            <View style={[itemStyles.dot, { backgroundColor: stateColor }]} />
            <Text style={[itemStyles.badgeText, { color: stateColor }]}>
              {stateLabel}
            </Text>
          </View>
          {canDelete && (
            <Pressable
              onPress={() => onDelete(campaign)}
              style={itemStyles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel="Delete campaign"
            >
              <Trash2 size={15} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      {campaign.state === 'draft' && (
        <Pressable
          onPress={() => onPublish(campaign)}
          style={itemStyles.publishButton}
        >
          <Megaphone size={14} color="#FFF" />
          <Text style={itemStyles.publishText}>{'Publish'}</Text>
        </Pressable>
      )}

      {campaign.state === 'publishing' && (
        <View style={itemStyles.publishingRow}>
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={itemStyles.publishingText}>{'Waiting for server confirmation…'}</Text>
        </View>
      )}
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  publishText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  publishingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishingText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets();
  const { activeWorkspace } = useBusinessStore();
  const queryClient = useQueryClient();
  const [pendingPublishCampaign, setPendingPublishCampaign] = useState<Campaign | null>(null);

  const workspaceId = activeWorkspace?.id ?? '';

  const { data: campaigns, isLoading, isError, refetch } = useQuery({
    queryKey: businessQueryKeys.campaigns(workspaceId),
    queryFn: () => {
      if (!workspaceId) throw new Error('No active workspace');
      return getCampaigns(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 20_000,
  });

  // R3.6: client transitions to publishing state and polls until backend confirms live
  const publishMutation = useMutation({
    mutationFn: ({ campaignId }: { campaignId: string }) =>
      publishCampaign(workspaceId, campaignId),
    onSuccess: () => {
      // Invalidate so the list re-fetches and shows "publishing" state
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.campaigns(workspaceId) });
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.overview(workspaceId) });
      // No positive acknowledgement toast per R3.6
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to publish campaign.';
      Alert.alert('Error', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ campaignId }: { campaignId: string }) =>
      deleteCampaign(workspaceId, campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.campaigns(workspaceId) });
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.overview(workspaceId) });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to delete campaign.';
      Alert.alert('Error', msg);
    },
  });

  const handleDeleteRequest = (campaign: Campaign) => {
    const doDelete = () => deleteMutation.mutate({ campaignId: campaign.id });

    if (typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
      if ((window as any).confirm(`Delete "${campaign.title}"? This cannot be undone.`)) doDelete();
    } else {
      Alert.alert(
        'Delete campaign',
        `Delete "${campaign.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  };
  const handlePublishRequest = (campaign: Campaign) => {
    const followerCount = activeWorkspace?.followerCount;
    const countLine =
      followerCount != null
        ? `\n\n${followerCount} opted-in followers will receive the campaign.`
        : '';

    Alert.alert(
      'Publish campaign',
      `Publish "${campaign.title}"?${countLine}\n\nOnce published, the content and audience list cannot be changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: () => {
            publishMutation.mutate({ campaignId: campaign.id });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{'Campaigns'}</Text>
        {/* Create button — opens campaign composer */}
        <Pressable style={styles.newButton} onPress={() => {
          router.push({
            pathname: '/(modals)/campaign-composer',
            params: { workspaceId },
          });
        }}>
          <Plus size={20} color="#FFF" />
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{'Could not load campaigns.'}</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <RefreshCw size={16} color={colors.primary} />
            <Text style={styles.retryText}>{'Try again'}</Text>
          </Pressable>
        </View>
      )}

      {campaigns && campaigns.length === 0 && (
        <View style={styles.emptyState}>
          <Megaphone size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{'No campaigns yet'}</Text>
          <Text style={styles.emptySubtitle}>
            {'Create your first campaign to reach your followers.'}
          </Text>
        </View>
      )}

      {campaigns && campaigns.length > 0 && (
        <FlatList
          data={campaigns}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <CampaignRow
              campaign={item}
              workspaceId={workspaceId}
              onPublish={handlePublishRequest}
              onDelete={handleDeleteRequest}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  separator: {
    height: 10,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
