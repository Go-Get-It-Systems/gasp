import React, { RefObject } from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.15;

interface WatermarkedCompositeProps {
  mediaUri: string;
  mediaType: 'image' | 'video';
  captureRef: RefObject<View>;
}

function VideoMedia({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function WatermarkedComposite({
  mediaUri,
  mediaType,
  captureRef,
}: WatermarkedCompositeProps) {
  return (
    <View
      ref={captureRef}
      style={styles.container}
      collapsable={false}
    >
      {mediaType === 'video' ? (
        <VideoMedia uri={mediaUri} />
      ) : (
        <ExpoImage
          source={{ uri: mediaUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}

      {/* Semi-transparent logo watermark */}
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.watermark}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    opacity: 0.6,
  },
});
