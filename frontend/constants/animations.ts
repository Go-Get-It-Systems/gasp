import { Easing } from 'react-native-reanimated';

export const springConfigs = {
  gentle: { damping: 20, stiffness: 200, mass: 0.5 },
  snappy: { damping: 15, stiffness: 400, mass: 0.3 },
  bouncy: { damping: 10, stiffness: 300, mass: 0.5 },
} as const;

export const timingConfigs = {
  fast: { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
  normal: { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
  slow: { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
} as const;

export const HOLD_DURATION_MS = 3000;
export const GASP_EXPIRE_HOURS = 24;
