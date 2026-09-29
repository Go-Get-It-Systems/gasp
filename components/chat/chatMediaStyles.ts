import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const chatMediaStyles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  mediaBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
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
  mediaContainer: {
    position: 'relative',
    width: 220,
    height: 300,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
});
