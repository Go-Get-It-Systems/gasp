import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface TextBubbleProps {
  content: string;
  isOwnMessage: boolean;
}

export function TextBubble({ content, isOwnMessage }: TextBubbleProps) {
  return (
    <View
      accessibilityLabel={content}
      style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble,
      ]}
    >
      <Text
        variant="body"
        style={[styles.text, isOwnMessage ? styles.ownText : styles.otherText]}
      >
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: colors.textPrimary,
  },
});
