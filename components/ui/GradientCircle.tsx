import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

export interface GradientCircleProps {
  /** Outer diameter of the gradient ring */
  size: number;
  /** Content to render centered inside the ring */
  children?: ReactNode;
}

export function GradientCircle({ size, children }: GradientCircleProps) {
  const borderWidth = Math.max(3, size * 0.04);
  const innerSize = size - borderWidth * 2;

  return (
    <View
      style={[
        styles.outerRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderCurve: 'continuous',
          // Gradient border ring: cyan -> pink -> purple
          experimental_backgroundImage:
            'linear-gradient(135deg, #06B6D4, #EC4899, #7C3AED)',
        },
      ]}
    >
      <View
        style={[
          styles.innerCircle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderCurve: 'continuous',
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
