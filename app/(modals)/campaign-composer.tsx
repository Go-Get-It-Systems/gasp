/**
 * Campaign Composer modal.
 *
 * Self-contained: the owner picks a video/image directly from here
 * using expo-image-picker, enters a title, then publishes.
 *
 * No camera navigation needed — eliminates all tab/stack crashes.
 */
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CheckCircle2, Video, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { createCampaign, getMyBusinesses, publishCampaign } from '@/services/api/business';
import { uploadWithRetry } from '@/services/uploadQueue';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';

export default function CampaignComposerScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { activeWorkspace, setActiveWorkspace } = useBusinessStore();

  // workspaceId can be passed as a route param (preferred) or fall back to the store
  const params = useLocalSearchParams<{ mediaUri?: string; isVideo?: string; workspaceId?: string }>();
  const paramWorkspaceId = params.workspaceId?.trim() || null;

  const [mediaUri, setMediaUri] = useState<string | null>(params.mediaUri ?? null);
  const [isVideo, setIsVideo] = useState(params.isVideo === 'true');
  const [title, setTitle] = useState('');
  const [published, setPublished] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'saving'>('idle');

  // Always fetch workspaces — this guarantees workspace is available even when
  // the app is backgrounded (e.g. Google Photos) and the store is cleared
  const { data: myBusinesses, isLoading: loadingWs } = useQuery({
    queryKey: businessQueryKeys.mine(),
    queryFn: async () => {
      const ws = await getMyBusinesses();
      const active = ws.find((w) => w.isActive) ?? ws[0] ?? null;
      if (active) setActiveWorkspace(active);
      return ws;
    },
    staleTime: 60_000,
    retry: 2,
  });

  // Resolve workspace: param id wins → store → query result
  const workspace =
    (paramWorkspaceId
      ? myBusinesses?.find((w) => w.id === paramWorkspaceId) ?? activeWorkspace
      : null) ??
    activeWorkspace ??
    myBusinesses?.find((w) => w.isActive) ??
    myBusinesses?.[0] ??
    null;

  // Re-validate workspace when app returns from background (e.g. after Google Photos)
  // This ensures the workspace is always available when the user returns to the composer
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        queryClient.invalidateQueries({ queryKey: businessQueryKeys.mine() });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  // Video player — only active when a video is selected
  const videoPlayer = useVideoPlayer(isVideo && mediaUri ? mediaUri : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Pick media from gallery
  const handlePickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to choose a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos', 'images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setIsVideo(asset.type === 'video');
    }
  };

  // Publish mutation — uploads media first, then creates+publishes campaign
  const publishMutation = useMutation({
    mutationFn: async () => {
      const wsId = workspace?.id;
      if (!wsId) throw new Error('Workspace not found. Please open Studio first.');
      if (!mediaUri) throw new Error('Please choose a video or image first.');
      if (!title.trim()) throw new Error('Please enter a campaign title.');

      // Step 1 — upload to Firebase Storage
      setUploadStep('uploading');
      const uploadResult = await uploadWithRetry(mediaUri, 'campaigns', wsId);
      if (!uploadResult.downloadUrl) throw new Error('Upload failed — no download URL returned.');

      // Step 2 — create draft + publish
      setUploadStep('saving');
      const campaign = await createCampaign(wsId, {
        title: title.trim(),
        mediaUrl: uploadResult.downloadUrl,   // ← public URL, not local URI
        isReplayable: false,
      });

      await publishCampaign(wsId, campaign.id);
      return { campaign, wsId };
    },
    onSuccess: ({ wsId }) => {
      setUploadStep('idle');
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.overview(wsId) });
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.campaigns(wsId) });
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.metrics(wsId) });
      setPublished(true);
    },
    onError: (err: any) => {
      setUploadStep('idle');
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to publish campaign.';
      Alert.alert('Error', msg);
      Sentry.captureException(err);
    },
  });

  // ── Success ───────────────────────────────────────────────────────────────
  if (published) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <CheckCircle2 size={56} color={colors.success} />
        <Text style={styles.successTitle}>Campaign published!</Text>
        <Text style={styles.successBody}>
          Your campaign is live and will be delivered to your followers.
        </Text>
        <Pressable
          style={styles.doneBtn}
          onPress={() => router.dismissAll()}
          accessibilityRole="button"
        >
          <Text style={styles.doneBtnText}>Back to Studio</Text>
        </Pressable>
      </View>
    );
  }

  const hasMedia = !!mediaUri;
  const hasTitle = title.trim().length > 0;
  const hasWorkspace = !!workspace?.id;
  const isPending = publishMutation.isPending;
  const canPublish = hasMedia && hasTitle && !isPending && !published;

  const publishBtnLabel = uploadStep === 'uploading'
    ? 'Uploading media…'
    : uploadStep === 'saving'
      ? 'Publishing…'
      : 'Publish Campaign';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Campaign</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Media picker */}
        <Pressable style={styles.mediaPicker} onPress={handlePickMedia} accessibilityRole="button">
          {hasMedia ? (
            isVideo ? (
              <VideoView
                player={videoPlayer}
                style={styles.mediaPreview}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <Image source={{ uri: mediaUri! }} style={styles.mediaPreview} resizeMode="cover" />
            )
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Video size={40} color={colors.textTertiary} />
              <Text style={styles.mediaPlaceholderText}>Tap to choose a video or image</Text>
              <Text style={styles.mediaPlaceholderHint}>From your camera roll</Text>
            </View>
          )}

          {/* Change overlay — hidden while publishing */}
          {hasMedia && !isPending && (
            <View style={styles.changeOverlay}>
              <Text style={styles.changeOverlayText}>Tap to change</Text>
            </View>
          )}
        </Pressable>

        {/* Title input */}
        <View style={styles.form}>
          <Text style={styles.label}>Campaign title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Summer Drop 2026"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
            returnKeyType="done"
            editable={!isPending}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Workspace hint */}
        {loadingWs && !hasWorkspace && (
          <Text style={styles.hint}>Loading workspace…</Text>
        )}
        {!loadingWs && !hasWorkspace && (
          <Text style={[styles.hint, { color: colors.error }]}>
            Workspace not found. Please open Studio first.
          </Text>
        )}

        {/* Publish button */}
        <Pressable
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
          onPress={() => {
            if (!canPublish) return;
            if (!hasWorkspace) {
              Alert.alert('Error', 'Workspace not ready. Please open Studio first.');
              return;
            }
            publishMutation.mutate();
          }}
          disabled={!canPublish}
          accessibilityRole="button"
          accessibilityLabel={publishBtnLabel}
        >
          {isPending ? (
            <View style={styles.publishBtnInner}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.publishBtnText}>{publishBtnLabel}</Text>
            </View>
          ) : (
            <Text style={styles.publishBtnText}>Publish Campaign</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: {
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700',
    color: colors.textPrimary, textAlign: 'center',
  },

  // Scroll
  scrollContent: { paddingHorizontal: 16, gap: 20, paddingTop: 4 },

  // Media picker
  mediaPicker: {
    height: 240,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mediaPreview: { flex: 1 },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mediaPlaceholderText: {
    fontSize: 15, fontWeight: '600',
    color: colors.textSecondary,
  },
  mediaPlaceholderHint: {
    fontSize: 13, color: colors.textTertiary,
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeOverlayText: {
    fontSize: 13, fontWeight: '600', color: '#FFF',
  },

  // Form
  form: { gap: 6 },
  label: {
    fontSize: 13, fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16, color: colors.textPrimary,
  },
  charCount: { fontSize: 12, color: colors.textTertiary, textAlign: 'right' },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  // Publish
  publishBtn: {
    height: 52, borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  publishBtnDisabled: { opacity: 0.4 },
  publishBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  publishBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Success
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  successBody: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: 8, height: 52, paddingHorizontal: 40,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
