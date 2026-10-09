import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { cacheMedia } from './mediaCache';

export function openBusinessStudio() { router.push('/(modals)/business-studio'); }
export function openMyCampaignReactions() { router.push('/(modals)/my-campaign-reactions'); }
export function openBusinessProfile(params: { handle: string; campaignId?: string }) {
  router.push({ pathname: '/(modals)/business-profile', params });
}
export function openCampaignComposer(params: { workspaceId: string; campaignId?: string }) {
  router.push({ pathname: '/(modals)/campaign-composer', params });
}
export function openCampaignDashboard(params: { workspaceId: string; campaignId: string }) {
  router.push({ pathname: '/(modals)/campaign-dashboard', params });
}
export function openCampaignViewer(params: { workspaceId: string; campaignId: string; handle: string }) {
  router.push({ pathname: '/(modals)/campaign-viewer', params });
}
export function openCampaignReactionComposer(params: { workspaceId: string; campaignId: string }) {
  router.push({ pathname: '/(modals)/campaign-react', params });
}
export function openBusinessReaction({ owner, ...params }: { workspaceId: string; campaignId: string; reactionId: string; owner?: boolean }) {
  router.push({ pathname: '/(modals)/business-reaction', params: { ...params, owner: owner ? 'true' : 'false' } });
}

// ── Camera Preview ───────────────────────────────────────────────────
interface CameraPreviewParams {
  imageUri: string;
  isVideo?: boolean;
  fromGallery?: boolean;
}

export function openCameraPreview({ imageUri, isVideo, fromGallery }: CameraPreviewParams) {
  router.push({
    pathname: '/(modals)/camera-preview',
    params: {
      imageUri,
      ...(isVideo && { isVideo: 'true' }),
      ...(fromGallery && { fromGallery: 'true' }),
    },
  });
}

// ── Send Gasp ────────────────────────────────────────────────────────
interface SendGaspParams {
  imageUri: string;
  isVideo?: boolean;
  textOverlay?: string;
}

export function openSendGasp({ imageUri, isVideo, textOverlay }: SendGaspParams) {
  router.push({
    pathname: '/(modals)/send-gasp',
    params: {
      imageUri,
      ...(isVideo && { isVideo: 'true' }),
      ...(textOverlay && { textOverlay }),
    },
  });
}

// ── View Gasp ────────────────────────────────────────────────────────
interface GaspViewerParams {
  imageUri: string;
  senderName: string;
  mediaType?: 'image' | 'video';
  blurhash?: string;
  gaspId?: string;
  conversationId?: string;
  messageId?: string;
  textOverlay?: string;
}

export async function openGaspViewer(params: GaspViewerParams): Promise<void> {
  const { imageUri, senderName, mediaType, blurhash, gaspId, conversationId, messageId, textOverlay } = params;

  if (!imageUri) return;

  // Preserve the original CDN URL for the composite payload BEFORE cacheMedia
  // replaces it with a local file:// path. view-gasp.tsx passes this as
  // chatGaspUrl → useViewGasp → compositeReaction payload.
  const cdnGaspUrl = imageUri;

  let localUri = imageUri;
  try {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    localUri = await cacheMedia(imageUri, expiry.toISOString());
  } catch {
    // Fallback to remote URL
  }

  router.push({
    pathname: '/(modals)/view-gasp',
    params: {
      ...(gaspId && { gaspId }),
      chatImageUri: localUri,
      chatSenderName: senderName,
      chatMediaType: mediaType ?? 'image',
      chatBlurhash: blurhash ?? '',
      chatConversationId: conversationId ?? '',
      chatMessageId: messageId ?? '',
      chatTextOverlay: textOverlay ?? '',
      chatGaspUrl: cdnGaspUrl,
    },
  });
}

// ── Chat ─────────────────────────────────────────────────────────────
interface ChatParams {
  conversationId: string;
  name?: string;
  avatarUrl?: string;
}

export function openChat({ conversationId, name, avatarUrl }: ChatParams) {
  router.push({
    pathname: '/chat/[id]',
    params: {
      id: conversationId,
      ...(name && { name }),
      ...(avatarUrl && { avatarUrl }),
    },
  });
}

// ── Friend Profile ────────────────────────────────────────────────────
interface FriendProfileParams {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export function openFriendProfile({ userId, displayName, avatarUrl }: FriendProfileParams) {
  router.push({
    pathname: '/(modals)/friend-profile',
    params: { userId, displayName, avatarUrl: avatarUrl ?? '' },
  });
}

// ── Reaction Result ──────────────────────────────────────────────────
interface ReactionResultParams {
  reactionVideoUri: string;
  originalImageUri: string;
  senderName: string;
  gaspId: string;
  originalMediaType?: 'image' | 'video';
}

export function openReactionResult({ reactionVideoUri, originalImageUri, senderName, gaspId, originalMediaType }: ReactionResultParams) {
  router.push({
    pathname: '/(modals)/reaction-result',
    params: { reactionVideoUri, originalImageUri, senderName, gaspId, originalMediaType: originalMediaType ?? 'image' },
  });
}

interface ReactionContinuationParams {
  reactionId: string;
  conversationId?: string | null;
  messageId?: string | null;
  gaspId: string;
  reactionVideoUri?: string;
  originalImageUri?: string;
  senderName?: string;
  originalMediaType?: 'image' | 'video';
}

export function openReactionContinuation({
  reactionId,
  conversationId,
  messageId,
  gaspId,
  reactionVideoUri,
  originalImageUri,
  senderName,
  originalMediaType,
}: ReactionContinuationParams): 'chat' | 'reaction' | 'none' {
  if (conversationId) {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conversationId,
        ...(messageId && { highlightMessageId: messageId }),
      },
    });
    return 'chat';
  }

  const context = { reactionId, gaspId };
  if (reactionVideoUri && originalImageUri && senderName) {
    Sentry.captureMessage('openReactionContinuation: missing conversation context', {
      level: 'warning',
      extra: context,
    });
    openReactionResult({
      reactionVideoUri,
      originalImageUri,
      senderName,
      gaspId,
      originalMediaType,
    });
    return 'reaction';
  }

  Sentry.captureMessage('openReactionContinuation: missing navigation context', {
    level: 'warning',
    extra: context,
  });
  return 'none';
}
