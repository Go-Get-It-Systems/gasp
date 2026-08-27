import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';
import { clsx } from 'clsx';

export interface SafeViewProps {
  /** View content */
  children: ReactNode;
  /** NativeWind class names */
  className?: string;
  /** Which edges to apply safe area insets to */
  edges?: Edge[];
}

export function SafeView({
  children,
  className,
  edges = ['top', 'right', 'bottom', 'left'],
}: SafeViewProps) {
  return (
    <SafeAreaView
      className={clsx(className)}
      edges={edges}
      style={styles.container}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
