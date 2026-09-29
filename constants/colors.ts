export const colors = {
  // Backgrounds
  background: '#0A0A0F',
  backgroundSecondary: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#232340',

  // Primary
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryDark: '#6D28D9',

  // Accent / Gradient stops
  accentPink: '#EC4899',
  accentMagenta: '#D946EF',
  accentCyan: '#06B6D4',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textMuted: '#4B5563',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // UI elements
  border: '#2A2A3E',
  borderLight: '#3A3A52',
  overlay: 'rgba(0, 0, 0, 0.6)',
  tabBar: 'rgba(10, 10, 15, 0.95)',

  // Gradient definitions (for experimental_backgroundImage)
  gradients: {
    logo: 'linear-gradient(135deg, #06B6D4, #EC4899, #7C3AED)',
    primary: 'linear-gradient(135deg, #7C3AED, #EC4899)',
    activeTab: 'linear-gradient(135deg, #EC4899, #7C3AED)',
    card: 'linear-gradient(180deg, #1A1A2E, #0F0F1A)',
    glow: 'radial-gradient(circle, rgba(124, 58, 237, 0.3), transparent 70%)',
  },
} as const;
