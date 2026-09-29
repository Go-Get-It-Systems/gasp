import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { ReactionComposite } from '@/components/gasp/ReactionComposite';
import { colors } from '@/constants/colors';
import { MediaBadge } from './MediaBadge';
import { chatMediaStyles } from './chatMediaStyles';

interface ReactionThumbnailProps {
  reactionUri?: string;
  originalUri?: string;
}

export function ReactionThumbnail({ reactionUri, originalUri }: ReactionThumbnailProps) {
  const canRenderComposite = !!reactionUri && !!originalUri;

  return (
    <View style={chatMediaStyles.mediaContainer}>
      <View testID="reaction-thumbnail-frame" style={[chatMediaStyles.media, styles.mediaFrame]}>
        {canRenderComposite ? (
          <ReactionComposite
            originalUri={originalUri}
            reactionVideoUri={reactionUri}
            showDivider
            watermarkMode="hidden"
            reactionPaused
            reactionMuted
            reactionFlex={45}
            originalFlex={55}
          />
        ) : (
          <LinearGradient
            colors={['#101820', '#17313A', '#101820']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.playCircle, canRenderComposite && styles.playCircleCompact]}>
          <Play size={canRenderComposite ? 18 : 24} color="#FFFFFF" fill="#FFFFFF" style={styles.playIcon} />
        </View>
      </View>
      <MediaBadge label="REACTION" variant="reaction" />
    </View>
  );
}

const styles = StyleSheet.create({
  mediaFrame: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(6, 182, 212, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.54)',
  },
  playCircleCompact: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    borderColor: 'rgba(255, 255, 255, 0.62)',
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  playIcon: {
    marginLeft: 2,
  },
});
