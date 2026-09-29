import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { clsx } from 'clsx';

export type CardVariant = 'default' | 'elevated';

export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** NativeWind class names */
  className?: string;
  /** Visual style variant */
  variant?: CardVariant;
}

const VARIANT_STYLES: Record<CardVariant, { backgroundColor: string }> = {
  default: {
    backgroundColor: '#1A1A2E',
  },
  elevated: {
    backgroundColor: '#232340',
  },
};

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <View
      className={clsx(className)}
      style={[
        styles.card,
        { backgroundColor: variantStyle.backgroundColor },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
});
