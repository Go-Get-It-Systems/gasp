import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { formatRelativeTime } from '@/utils/format';
import type { Reaction } from '@/services/api/schemas/gasp.schema';

interface ReactionItemProps {
  reaction: Reaction;
  onPress: (reaction: Reaction) => void;
}

export function ReactionItem({ reaction, onPress }: ReactionItemProps) {
  const { t } = useTranslation();
  const timeLabel = formatRelativeTime(reaction.capturedAt);
  const reactorLabel = reaction.reactorName || t('reaction.someone');

  return (
    <Pressable
      onPress={() => onPress(reaction)}
      style={styles.container}
      accessibilityLabel={t('reaction.reactedToYourGasp', { name: reactorLabel })}
    >
      <Avatar
        uri={null}
        size={36}
        initials={reaction.reactorName || '?'}
      />
      <View style={styles.textContainer}>
        <Text variant="body" style={styles.text}>
          <Text variant="body" style={styles.name}>{reactorLabel}</Text>
          {t('reaction.reacted')}
        </Text>
        <Text variant="caption" style={styles.time}>{timeLabel}</Text>
      </View>
      {reaction.originalImageUri ? (
        <Image
          source={{ uri: reaction.originalImageUri }}
          style={styles.thumbnail}
          contentFit="cover"
          blurRadius={12}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  text: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  name: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  thumbnail: {
    width: 36,
    height: 48,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
});
