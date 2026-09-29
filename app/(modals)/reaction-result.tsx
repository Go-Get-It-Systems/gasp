import React, { useCallback } from 'react';
import { StyleSheet, View, Alert, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Sentry from '@sentry/react-native';
import { ReactionPreview } from '@/components/gasp/ReactionPreview';
import { useGaspStore } from '@/stores/gaspStore';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import type { Reaction } from '@/services/api/schemas/gasp.schema';

export default function ReactionResultScreen() {
  const insets = useSafeAreaInsets();
  const { reactionVideoUri, originalImageUri, senderName, gaspId, originalMediaType } =
    useLocalSearchParams<{
      reactionVideoUri: string;
      originalImageUri: string;
      senderName: string;
      gaspId: string;
      originalMediaType?: string;
    }>();

  const mediaType = (originalMediaType === 'video' ? 'video' : 'image') as 'image' | 'video';
  const user = useAuthStore((s) => s.user);
  const { addReaction, markGaspViewed } = useGaspStore();

  const handleRetake = useCallback(() => { router.back(); }, []);

  const handleSend = useCallback(() => {
    const reaction: Reaction = {
      id: `reaction-${Date.now()}`,
      gaspId: gaspId ?? '',
      reactorId: user?.id ?? 'guest',
      reactorName: user?.displayName ?? 'You',
      reactionVideoUri: reactionVideoUri ?? '',
      originalImageUri: originalImageUri ?? '',
      capturedAt: new Date().toISOString(),
    };
    addReaction(reaction);
    markGaspViewed(gaspId ?? '');
    router.dismissAll();
  }, [gaspId, user, reactionVideoUri, originalImageUri, addReaction, markGaspViewed]);

  const handleSave = useCallback(async () => {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to your photo library to save this media.');
        return;
      }
      // TODO: wire compositeUrl once available in screen params
      const uri = originalImageUri ?? '';
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Saved to your camera roll.');
    } catch (e) {
      Sentry.captureException(e);
      Alert.alert('Save failed', 'Could not save this media.');
    }
  }, [originalImageUri]);

  const handleShare = useCallback(async () => {
    try {
      // TODO: wire compositeUrl once available in screen params
      const uri = originalImageUri ?? '';
      await Share.share({ url: uri });
    } catch (e) {
      Sentry.captureException(e);
    }
  }, [originalImageUri]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ReactionPreview
        originalImageUri={originalImageUri ?? ''}
        originalMediaType={mediaType}
        reactionVideoUri={reactionVideoUri ?? ''}
        senderName={senderName ?? ''}
        onSend={handleSend}
        onRetake={handleRetake}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
