import { router } from 'expo-router';
import { cacheMedia } from './mediaCache';

// ── Camera Preview ───────────────────────────────────────────────────
interface CameraPreviewParams {
  imageUri: string;
  isVideo?: boolean;
  fromGallery?: boolean;
  mode?: 'campaign';
}

export function openCameraPreview({ imageUri, isVideo, fromGallery, mode }: CameraPreviewParams) {
  router.push({
    pathname: '/(modals)/camera-preview',
    params: {
      imageUri,
      ...(isVideo && { isVideo: 'true' }),
      ...(fromGallery && { fromGallery: 'true' }),
      ...(mode && { mode }),
    },
  });
}

/**
 * Opens the camera preview in campaign mode.
 * After recording, the user is taken to the campaign-composer instead of send-gasp.
 */
export function openCampaignCameraPreview({ imageUri, isVideo }: { imageUri: string; isVideo?: boolean }) {
  router.push({
    pathname: '/(modals)/camera-preview',
    params: {
      imageUri,
      ...(isVideo && { isVideo: 'true' }),
      mode: 'campaign',
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

// ── Business Profile ──────────────────────────────────────────────────
export function openBusinessProfile({ userId, displayName, avatarUrl, username }: FriendProfileParams & { username?: string }) {
  router.push({
    pathname: '/(modals)/business-profile',
    params: { userId, displayName, avatarUrl: avatarUrl ?? '', ...(username && { workspaceHandle: username }) },
  });
}

/**
 * Opens the correct profile modal based on the user's accountType.
 * business → business-profile, personal → friend-profile
 */
export function openProfile({
  userId,
  displayName,
  avatarUrl,
  accountType,
  username,
}: FriendProfileParams & { accountType?: string; username?: string }) {
  if (accountType === 'business') {
    openBusinessProfile({ userId, displayName, avatarUrl, username });
  } else {
    openFriendProfile({ userId, displayName, avatarUrl });
  }
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
