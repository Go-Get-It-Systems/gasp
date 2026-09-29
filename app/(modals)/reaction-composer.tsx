/**
 * Reaction Composer modal.
 * Receives a recorded video URI and submits it as a reaction to a campaign.
 * Only reachable by followers.
 */
import * as Sentry from '@sentry/react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CheckCircle2, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { submitCampaignReaction } from '@/services/api/business';

export default function ReactionComposerScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  const { mediaUri, isVideo, workspaceId, campaignId, campaignTitle } =
    useLocalSearchParams<{
      mediaUri: string;
      isVideo?: string;
      workspaceId: string;
      campaignId: string;
      campaignTitle: string;
    }>();

  const isVideoMode = isVideo === 'true';

  const videoPlayer = useVideoPlayer(isVideoMode && mediaUri ? mediaUri : null, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitCampaignReaction(workspaceId, {
        campaignId,
        videoUrl: mediaUri,
      }),
    onSuccess: () => {
      // Invalidate reactions for this workspace
      queryClient.invalidateQueries({ queryKey: ['businesses', 'handle'] });
      setSubmitted(true);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to submit reaction.';
      Alert.alert('Error', msg);
      Sentry.captureException(err);
    },
  });

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <CheckCircle2 size={56} color={colors.success} />
        <Text style={styles.successTitle}>Reaction submitted!</Text>
        <Text style={styles.successBody}>
          Your reaction to "{campaignTitle}" has been added.
        </Text>
        <Pressable
          style={styles.doneBtn}
          onPress={() => router.dismissAll()}
          accessibilityRole="button"
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button">
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>React to Campaign</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Campaign label */}
      <View style={styles.campaignLabel}>
        <Text style={styles.campaignLabelText} numberOfLines={1}>
          📣 {campaignTitle}
        </Text>
      </View>

      {/* Video preview */}
      <View style={styles.previewContainer}>
        {isVideoMode && mediaUri ? (
          <VideoView
            player={videoPlayer}
            style={styles.preview}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <View style={[styles.preview, styles.previewFallback]}>
            <Text style={{ color: colors.textTertiary }}>No video captured</Text>
          </View>
        )}
      </View>

      {/* Submit button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.submitBtn, submitMutation.isPending && styles.submitBtnDisabled]}
          onPress={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !mediaUri}
          accessibilityRole="button"
          accessibilityLabel="Submit reaction"
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Reaction</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  campaignLabel: {
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 10, borderCurve: 'continuous',
    borderWidth: 1, borderColor: colors.border,
  },
  campaignLabelText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  previewContainer: {
    marginHorizontal: 16, flex: 1,
    borderRadius: 16, borderCurve: 'continuous',
    overflow: 'hidden', backgroundColor: colors.surfaceElevated,
    maxHeight: 400,
  },
  preview: { flex: 1 },
  previewFallback: { justifyContent: 'center', alignItems: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 16 },
  submitBtn: {
    height: 52, borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  successBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  doneBtn: {
    marginTop: 8, height: 48, paddingHorizontal: 40,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
