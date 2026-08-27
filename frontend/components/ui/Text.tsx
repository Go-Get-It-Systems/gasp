import { Text as RNText, type TextProps, StyleSheet } from 'react-native';
import { clsx } from 'clsx';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

export type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

export interface GaspTextProps extends TextProps {
  /** Predefined text style variant */
  variant?: TextVariant;
  /** Override the default color */
  color?: string;
  /** Override the font weight */
  weight?: FontWeight;
  /** NativeWind class names */
  className?: string;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<
  TextVariant,
  { fontSize: number; fontWeight: FontWeight; lineHeight: number; color: string }
> = {
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#FFFFFF',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#FFFFFF',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: '#9CA3AF',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#9CA3AF',
  },
};

export function Text({
  variant = 'body',
  color,
  weight,
  className,
  style,
  children,
  ...rest
}: GaspTextProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <RNText
      className={clsx(className)}
      style={[
        styles.base,
        {
          fontSize: variantStyle.fontSize,
          fontWeight: weight ?? variantStyle.fontWeight,
          lineHeight: variantStyle.lineHeight,
          color: color ?? variantStyle.color,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    // Ensures consistent text rendering across platforms
    includeFontPadding: false,
  },
});
