import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

const CARD_WIDTH = 160;
const AVATAR_INNER = 54;

export const businessDiscoverCardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    minHeight: 230,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  badgeStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  avatarSection: {
    marginTop: 12,
    marginBottom: 10,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  username: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accentCyan,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 9,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  addText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followingButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    width: '100%',
    paddingVertical: 9,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  sentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
