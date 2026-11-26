import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const businessSearchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textSecondary },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  addText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  followingButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followingText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  sentButton: { backgroundColor: colors.surface },
  sentText: { fontSize: 13, color: colors.textSecondary },
  friendsButton: { backgroundColor: colors.surface },
  friendsText: { fontSize: 13, color: colors.success },
});
