import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as MediaLibrary from 'expo-media-library';
import * as Sentry from '@sentry/react-native';
import { X } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { DraggableText } from '@/components/camera/DraggableText';
import { TextEditOverlay } from '@/components/camera/TextEditOverlay';
import { PreviewBottomBar } from '@/components/camera/PreviewBottomBar';
import { TrashZone } from '@/components/camera/TrashZone';
import { colors } from '@/constants/colors';
import { useTextOverlay } from '@/hooks/useTextOverlay';
import { openSendGasp } from '@/services/navigation';

export default function CameraPreviewScreen() {
  const { imageUri, isVideo, fromGallery } = useLocalSearchParams<{ imageUri: string; isVideo?: string; fromGallery?: string }>();
  const insets = useSafeAreaInsets();
  const isVideoMode = isVideo === 'true';
  const isFromGallery = fromGallery === 'true';
  const [videoReady, setVideoReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const captureViewRef = useRef<View>(null);

  const overlay = useTextOverlay();
  const { state, handlers } = overlay;
  const {
    isTextEditing,
    isDragging,
    isOverTrash,
    committedText,
    textConfig,
    textPosition,
  } = state;
  const {
    handleOpenTextEditor,
    handleTapText,
    handleDragStart,
    handleDragEnd,
    handleDragOverTrash,
    handlePositionChange,
  } = handlers;

  const videoPlayer = useVideoPlayer(isVideoMode ? imageUri : null, (p) => {
    p.loop = true;
    p.playbackRate = 1.0;
    p.play();
  });

  useEffect(() => {
    if (!isVideoMode) return;
    if (videoPlayer.status === 'readyToPlay') {
      setVideoReady(true);
      return;
    }
    const sub = videoPlayer.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') setVideoReady(true);
    });
    return () => sub.remove();
  }, [isVideoMode, videoPlayer]);

  const handleSave = useCallback(async () => {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Allow access to your photo library to save this media.',
          [{ text: 'OK' }],
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert('Saved', 'Saved to your camera roll.', [{ text: 'OK' }]);
    } catch (e) {
      Sentry.captureException(e);
      Alert.alert('Save failed', 'Could not save this media.', [{ text: 'OK' }]);
    }
  }, [imageUri]);

  const handleSend = useCallback(async () => {
    if (isSending) return;
    setIsSending(true);

    let finalUri = imageUri;

    if (committedText && !isVideoMode && captureViewRef.current) {
      try {
        finalUri = await captureRef(captureViewRef, { format: 'jpg', quality: 0.9 });
      } catch {
        // Fallback to original image
      }
    }

    const textOverlay = committedText && isVideoMode
      ? JSON.stringify({ text: committedText, ...textConfig, pos: textPosition })
      : undefined;

    openSendGasp({
      imageUri: finalUri,
      ...(isVideoMode && { isVideo: true }),
      ...(textOverlay && { textOverlay }),
    });
    setTimeout(() => setIsSending(false), 600);
  }, [imageUri, isVideoMode, committedText, textConfig, textPosition, isSending]);

  return (
    <View style={styles.container}>
      {/* Capturable area: media + text overlay */}
      <View ref={captureViewRef} style={styles.captureArea} collapsable={false}>
        {imageUri ? (
          isVideoMode ? (
            <View style={styles.preview}>
              <VideoView
                player={videoPlayer}
                style={StyleSheet.absoluteFill}
                contentFit={isFromGallery ? 'contain' : 'cover'}
                nativeControls={false}
              />
              {!videoReady && <ActivityIndicator size="large" color="#FFFFFF" />}
            </View>
          ) : (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode={isFromGallery ? 'contain' : 'cover'} />
          )
        ) : (
          <View style={styles.preview}>
            <Text variant="body" color={colors.textSecondary}>No image captured</Text>
          </View>
        )}

        {/* Draggable text overlay — inside capture area */}
        {committedText !== '' && !isTextEditing && (
          <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 8 }]}>
            <DraggableText
              text={committedText}
              config={textConfig}
              onTap={handleTapText}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTrash={handleDragOverTrash}
              onPositionChange={handlePositionChange}
            />
          </View>
        )}
      </View>

      {/* Text editing overlay */}
      {isTextEditing && <TextEditOverlay overlay={overlay} />}

      {/* Trash zone — visible only when dragging */}
      {isDragging && (
        <TrashZone isOverTrash={isOverTrash} bottomInset={insets.bottom} />
      )}

      {/* Top bar — hidden during editing and dragging */}
      {!isTextEditing && !isDragging && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <X size={28} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      {/* Bottom bar — hidden during editing and dragging */}
      {!isTextEditing && !isDragging && (
        <PreviewBottomBar
          onRetake={() => router.back()}
          onSend={handleSend}
          onSave={handleSave}
          onOpenText={handleOpenTextEditor}
          isSending={isSending}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  captureArea: {
    ...StyleSheet.absoluteFillObject,
  },
  preview: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
