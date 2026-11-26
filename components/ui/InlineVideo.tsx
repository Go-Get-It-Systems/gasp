import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { VideoView } from 'expo-video';
import { usePrivateVideoPlayer as useVideoPlayer } from '@/hooks/usePrivateVideoPlayer';
import { colors } from '@/constants/colors';

/** Inline looping video with loading spinner — controls play/pause without remounting */
export function InlineVideo({
  uri,
  style,
  paused,
  muted = true,
  contentFit = 'cover',
}: {
  uri: string;
  style: object;
  paused: boolean;
  muted?: boolean;
  contentFit?: 'cover' | 'contain';
}) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    if (!paused) p.play();
  });

  useEffect(() => {
    if (player.status === 'readyToPlay') {
      setReady(true);
      if (!paused) player.play();
      return;
    }
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') {
        setReady(true);
        if (!paused) player.play();
      }
    });
    return () => sub.remove();
  }, [player, paused]);

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  return (
    <View style={style}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={contentFit} nativeControls={false} />
      {!ready && (
        <View style={styles.videoLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
