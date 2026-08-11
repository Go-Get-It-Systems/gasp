import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ReactNode } from 'react';

interface BubbleWrapperProps {
  isOwnMessage: boolean;
  isSequential: boolean;
  isHighlighted?: boolean;
  createdAt: string;
  children: ReactNode;
  onLongPress?: () => void;
}

export function BubbleWrapper({
  isOwnMessage,
  isSequential,
  isHighlighted = false,
  createdAt,
  children,
  onLongPress,
}: BubbleWrapperProps) {
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole={onLongPress ? 'button' : undefined}
      style={[
        styles.container,
        isOwnMessage ? styles.ownContainer : styles.otherContainer,
        isHighlighted && styles.highlighted,
        { marginTop: isSequential ? 4 : 16 },
      ]}
    >
      {children}
      <Text variant="caption" style={[styles.time, isOwnMessage ? styles.ownTime : styles.otherTime]}>
        {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    paddingHorizontal: 16,
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  highlighted: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentCyan,
    borderRadius: 12,
    borderWidth: 1,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSecondary,
  },
  ownTime: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  otherTime: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
});
