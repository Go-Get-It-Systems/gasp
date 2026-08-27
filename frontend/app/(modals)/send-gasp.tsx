import { useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { X, Send, Check, Repeat, RefreshCw, AlertCircle, WifiOff, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import { Text } from '@/components/ui/Text';
import { SearchBar } from '@/components/ui/SearchBar';
import { useInboxStore } from '@/stores/inboxStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import type { InboxFriend } from '@/stores/inboxStore';
import { useSendBatchGasp } from '@/hooks/queries/useGasps';
import { useGetOrCreateConversation } from '@/hooks/queries/useChat';
import { uploadWithRetry } from '@/services/uploadQueue';
import { compressImage } from '@/services/imageCompression';
import { compressVideo } from '@/services/videoCompression';
import { colors } from '@/constants/colors';

type SendErrorKind = 'server' | 'network' | 'rateLimit' | 'upload' | 'generic';

interface SendErrorState {
  kind: SendErrorKind;
  canRetry: boolean;
}

function classifySendError(error: unknown, hasUploadedMedia: boolean): SendErrorState {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === undefined) {
      return { kind: 'network', canRetry: true };
    }
    if (status >= 500) {
      return { kind: 'server', canRetry: true };
    }
    if (status === 429) {
      return { kind: 'rateLimit', canRetry: true };
    }
    return { kind: 'generic', canRetry: false };
  }
  if (!hasUploadedMedia) {
    return { kind: 'upload', canRetry: true };
  }
  return { kind: 'generic', canRetry: false };
}

const ERROR_COPY: Record<
  SendErrorKind,
  {
    titleKey: string;
    messageKey: string;
    iconColor: string;
    iconBg: string;
    Icon: typeof RefreshCw;
  }
> = {
  server: {
    titleKey: 'sendGasp.errorServerTitle',
    messageKey: 'sendGasp.errorServerMessage',
    iconColor: colors.warning,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    Icon: RefreshCw,
  },
  network: {
    titleKey: 'sendGasp.errorNetworkTitle',
    messageKey: 'sendGasp.errorNetworkMessage',
    iconColor: colors.warning,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    Icon: WifiOff,
  },
  rateLimit: {
    titleKey: 'sendGasp.errorRateLimitTitle',
    messageKey: 'sendGasp.errorRateLimitMessage',
    iconColor: colors.warning,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    Icon: Clock,
  },
  upload: {
    titleKey: 'sendGasp.errorUploadTitle',
    messageKey: 'sendGasp.errorUploadMessage',
    iconColor: colors.error,
    iconBg: 'rgba(239, 68, 68, 0.15)',
    Icon: AlertCircle,
  },
  generic: {
    titleKey: 'sendGasp.errorGenericTitle',
    messageKey: 'sendGasp.errorGenericMessage',
    iconColor: colors.error,
    iconBg: 'rgba(239, 68, 68, 0.15)',
    Icon: AlertCircle,
  },
};

export default function SendGaspScreen() {
  const { imageUri, isVideo, textOverlay } = useLocalSearchParams<{ imageUri: string; isVideo?: string; textOverlay?: string }>();
  const isVideoMode = isVideo === 'true';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const friends = useInboxStore((s) => s.friends);
  const user = useAuthStore((s) => s.user);
  const sendBatchMutation = useSendBatchGasp();
  const getOrCreateMutation = useGetOrCreateConversation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replayable, setReplayable] = useState(false);
  const [errorState, setErrorState] = useState<SendErrorState | null>(null);
  // Preserva a mídia já uploadada para reaproveitar no retry — evita refazer compress + upload.
  const uploadedMediaRef = useRef<{ downloadUrl: string } | null>(null);

  const filteredFriends = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.username.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const toggleFriend = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === friends.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(friends.map((f) => f.id)));
    }
  }, [friends, selectedIds.size]);

  const submitMetadata = useCallback(
    async (downloadUrl: string) => {
      const recipientArray = Array.from(selectedIds);
      const { sendMessage } = useChatStore.getState();

      await sendBatchMutation.mutateAsync({
        recipientIds: recipientArray,
        imageUrl: downloadUrl,
        ...(isVideoMode && { mediaType: 'video' as const }),
        ...(textOverlay && { textOverlay }),
        replayable,
      });

      // Fire-and-forget socket chat messages so they visually populate the conversation stream
      for (const friendId of recipientArray) {
        try {
          const conv = await getOrCreateMutation.mutateAsync(friendId);
          let content: string;
          if (textOverlay) {
            const parsed = JSON.parse(textOverlay);
            parsed.mediaType = isVideoMode ? 'video' : 'image';
            content = JSON.stringify(parsed);
          } else {
            content = isVideoMode ? '[VideoGasp]' : '[Gasp]';
          }
          sendMessage(conv.id, content, 'gasp', downloadUrl);
        } catch (e) {
          Sentry.captureException(e, { extra: { context: 'send-gasp.fanOutChatMessage', friendId } });
        }
      }
    },
    [selectedIds, isVideoMode, textOverlay, replayable, sendBatchMutation, getOrCreateMutation],
  );

  const handleSend = useCallback(async () => {
    if (!imageUri || isUploading) return;

    const userId = user?.id ?? 'guest';
    setErrorState(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let downloadUrl = uploadedMediaRef.current?.downloadUrl;

      if (!downloadUrl) {
        // 1. Compress media before upload
        setUploadProgress(0.05);
        const compressedUri = isVideoMode
          ? await compressVideo(imageUri)
          : await compressImage(imageUri);

        // 2. Upload to Firebase Storage
        const result = await uploadWithRetry(compressedUri, 'gasps', userId, ({ progress }) => {
          setUploadProgress(0.1 + progress * 0.7); // 10-80% for upload
        });
        downloadUrl = result.downloadUrl;
        uploadedMediaRef.current = { downloadUrl };
      } else {
        // Já uploadou em uma tentativa anterior — pula direto pro metadata save
        setUploadProgress(0.85);
      }

      // 3. Save gasp metadata to backend
      setUploadProgress(0.9);
      await submitMetadata(downloadUrl);

      setUploadProgress(1);
      uploadedMediaRef.current = null;
      router.dismissAll();
      router.replace('/(tabs)/camera');
    } catch (error) {
      const hasUploadedMedia = uploadedMediaRef.current !== null;
      const classified = classifySendError(error, hasUploadedMedia);
      Sentry.captureException(error, {
        extra: {
          context: 'send-gasp.handleSend',
          recipientCount: selectedIds.size,
          mediaType: isVideoMode ? 'video' : 'image',
          hasUploadedMedia,
          errorKind: classified.kind,
        },
      });
      setErrorState(classified);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [imageUri, isUploading, user?.id, isVideoMode, selectedIds.size, submitMetadata]);

  const handleRetry = useCallback(() => {
    setErrorState(null);
    handleSend();
  }, [handleSend]);

  const handleDismissError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleClose = () => {
    router.back();
  };

  const renderFriend = useCallback(
    ({ item }: { item: InboxFriend }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <Pressable
          onPress={() => toggleFriend(item.id)}
          style={styles.friendRow}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text variant="body" style={styles.avatarInitial}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {item.onlineStatus === 'online' && (
              <View style={styles.onlineDot} />
            )}
          </View>

          {/* Name & username */}
          <View style={styles.friendInfo}>
            <Text variant="body" style={styles.friendName}>
              {item.name}
            </Text>
            <Text variant="caption" style={styles.friendUsername}>
              {'@'}{item.username}
            </Text>
          </View>

          {/* Selection indicator */}
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </View>
        </Pressable>
      );
    },
    [selectedIds, toggleFriend]
  );

  const keyExtractor = useCallback((item: InboxFriend) => item.id, []);

  const allSelected = selectedIds.size === friends.length && friends.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X size={24} color="#FFFFFF" />
        </Pressable>

        <Text variant="subtitle" style={styles.headerTitle}>
          {'Send to'}
        </Text>

        {/* Image preview thumbnail */}
        {imageUri ? (
          <View style={styles.previewThumb}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </Animated.View>

      {/* Search */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(100)}
        style={styles.searchContainer}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search friends..."
        />
      </Animated.View>

      {/* Select all row */}
      <Animated.View entering={FadeInDown.duration(300).delay(150)}>
        <Pressable onPress={selectAll} style={styles.selectAllRow}>
          <Text variant="label" style={styles.selectAllText}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Text>
          {selectedIds.size > 0 && (
            <Text variant="caption" style={styles.selectedCount}>
              {selectedIds.size.toString()}{' selected'}
            </Text>
          )}
        </Pressable>
      </Animated.View>

      {/* Replayable toggle */}
      <Animated.View entering={FadeInDown.duration(300).delay(175)}>
        <Pressable
          onPress={() => setReplayable((v) => !v)}
          accessibilityRole="switch"
          accessibilityLabel="Allow recipient to replay this gasp"
          accessibilityState={{ checked: replayable }}
          style={styles.replayableRow}
        >
          <View style={styles.replayableLeft}>
            <Repeat size={18} color={replayable ? colors.primary : colors.textSecondary} />
            <View style={styles.replayableTextWrap}>
              <Text variant="label" style={styles.replayableTitle}>
                {replayable ? 'Replayable' : 'Play once'}
              </Text>
              <Text variant="caption" style={styles.replayableSubtitle}>
                {replayable
                  ? 'Recipient can replay until it expires'
                  : 'Single view, disappears after viewing'}
              </Text>
            </View>
          </View>
          <View style={[styles.toggle, replayable && styles.toggleOn]}>
            <View style={[styles.toggleKnob, replayable && styles.toggleKnobOn]} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Friend list */}
      <FlatList
        data={filteredFriends}
        renderItem={renderFriend}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Send button */}
      {selectedIds.size > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.sendContainer, { paddingBottom: insets.bottom + 16 }]}
        >
          <Pressable
            onPress={handleSend}
            disabled={isUploading}
            style={[styles.sendButton, isUploading && styles.sendButtonDisabled]}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text variant="body" style={styles.sendText}>
                  {uploadProgress < 0.1 ? 'Compressing... ' : 'Uploading... '}{Math.round(uploadProgress * 100)}{'%'}
                </Text>
              </>
            ) : (
              <>
                <Send size={20} color="#FFFFFF" />
                <Text variant="body" style={styles.sendText}>
                  {'Send to '}{selectedIds.size.toString()}{selectedIds.size === 1 ? ' friend' : ' friends'}
                </Text>
              </>
            )}
          </Pressable>

          {/* Upload progress bar */}
          {isUploading && (
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${uploadProgress * 100}%` }]}
              />
            </View>
          )}
        </Animated.View>
      )}

      {/* Error modal */}
      {errorState && (() => {
        const copy = ERROR_COPY[errorState.kind];
        const IconComponent = copy.Icon;
        return (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={styles.errorModalBackdrop}
            accessibilityViewIsModal
          >
            <Animated.View
              entering={FadeInDown.duration(220)}
              style={styles.errorModalCard}
            >
              <View style={[styles.errorModalIcon, { backgroundColor: copy.iconBg }]}>
                <IconComponent size={28} color={copy.iconColor} />
              </View>
              <Text variant="subtitle" style={styles.errorModalTitle}>
                {t(copy.titleKey)}
              </Text>
              <Text variant="body" style={styles.errorModalMessage}>
                {t(copy.messageKey)}
              </Text>
              <View style={styles.errorModalButtons}>
                <Pressable
                  onPress={handleDismissError}
                  style={styles.errorModalSecondaryButton}
                  accessibilityRole="button"
                  accessibilityLabel={errorState.canRetry ? t('common.cancel') : t('common.ok')}
                >
                  <Text variant="body" style={styles.errorModalSecondaryText}>
                    {errorState.canRetry ? t('common.cancel') : t('common.ok')}
                  </Text>
                </Pressable>
                {errorState.canRetry && (
                  <Pressable
                    onPress={handleRetry}
                    style={styles.errorModalPrimaryButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.tryAgain')}
                  >
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text variant="body" style={styles.errorModalPrimaryText}>
                      {t('common.tryAgain')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        );
      })()}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectAllText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  selectedCount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  friendUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sendContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 28,
    borderCurve: 'continuous',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  replayableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  replayableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  replayableTextWrap: {
    flex: 1,
  },
  replayableTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  replayableSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  errorModalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 1000,
  },
  errorModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorModalTitle: {
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 19,
  },
  errorModalMessage: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  errorModalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  errorModalSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorModalSecondaryText: {
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 15,
  },
  errorModalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorModalPrimaryText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
