import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const campaignComposerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: {
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700',
    color: colors.textPrimary, textAlign: 'center',
  },

  // Scroll
  scrollContent: { paddingHorizontal: 16, gap: 20, paddingTop: 4 },

  // Media picker
  mediaPicker: {
    height: 240,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mediaPreview: { flex: 1 },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mediaPlaceholderText: {
    fontSize: 15, fontWeight: '600',
    color: colors.textSecondary,
  },
  mediaPlaceholderHint: {
    fontSize: 13, color: colors.textTertiary,
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeOverlayText: {
    fontSize: 13, fontWeight: '600', color: '#FFF',
  },

  // Form
  form: { gap: 6 },
  label: {
    fontSize: 13, fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16, color: colors.textPrimary,
  },
  charCount: { fontSize: 12, color: colors.textTertiary, textAlign: 'right' },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  // Publish
  publishBtn: {
    height: 52, borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  publishBtnDisabled: { opacity: 0.4 },
  publishBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  publishBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Success
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  successBody: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: 8, height: 52, paddingHorizontal: 40,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
