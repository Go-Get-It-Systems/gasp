import { useCallback, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

/**
 * Size of the view that receives `onLayout`, falling back to the window size
 * until it has been measured. Use for full-screen overlays inside a modal
 * sheet, which is shorter than the window.
 */
export function useContainerSize() {
  const windowSize = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  }, []);

  return {
    width: size?.width ?? windowSize.width,
    height: size?.height ?? windowSize.height,
    onLayout,
  };
}
