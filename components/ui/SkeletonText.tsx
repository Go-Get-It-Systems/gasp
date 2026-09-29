import { View } from 'react-native';
import { Skeleton } from './Skeleton';

interface SkeletonTextProps {
  lines?: number;
  /** Shorthand for a single-line skeleton: renders lines=1 with this width. */
  width?: string;
  widths?: string[];
  lineHeight?: number;
  gap?: number;
}

export function SkeletonText({ lines = 3, width, widths, lineHeight = 14, gap = 8 }: SkeletonTextProps) {
  // If a single `width` shorthand is provided, render one line at that width.
  const resolvedLines = width !== undefined ? 1 : lines;
  const resolvedWidths = width !== undefined ? [width] : widths;
  const defaultWidths = ['100%', '100%', '75%'];

  return (
    <View style={{ gap }}>
      {Array.from({ length: resolvedLines }).map((_, i) => (
        <Skeleton
          key={i}
          width={resolvedWidths?.[i] ?? defaultWidths[i] ?? '100%'}
          height={lineHeight}
          borderRadius={4}
        />
      ))}
    </View>
  );
}
