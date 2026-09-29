import { ActivityIndicator, View, StyleSheet, type ViewStyle } from 'react-native';

export interface LoadingSpinnerProps {
  /** Spinner size */
  size?: 'small' | 'large' | number;
  /** Spinner color (defaults to primary purple) */
  color?: string;
  /** Additional container style */
  style?: ViewStyle;
}

export function LoadingSpinner({
  size = 'large',
  color = '#7C3AED',
  style,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
