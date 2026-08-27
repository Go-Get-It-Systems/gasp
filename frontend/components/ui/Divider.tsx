import { View, StyleSheet } from 'react-native';
import { clsx } from 'clsx';
import { Text } from './Text';

export interface DividerProps {
  /** Optional text to display in the center of the divider (e.g. "OR") */
  text?: string;
  /** NativeWind class names */
  className?: string;
}

export function Divider({ text, className }: DividerProps) {
  if (text) {
    return (
      <View className={clsx(className)} style={styles.container}>
        <View style={styles.line} />
        <Text variant="caption" color="#6B7280" style={styles.text}>
          {text}
        </Text>
        <View style={styles.line} />
      </View>
    );
  }

  return (
    <View className={clsx(className)} style={styles.container}>
      <View style={styles.lineFull} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  lineFull: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  text: {
    letterSpacing: 1.5,
    fontSize: 11,
  },
});
