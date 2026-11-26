import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const publicCampaignStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  media: {
    height: 110,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  mediaFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  stateBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  stateText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  titleBlock: { padding: 8 },
  campaignTitle: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },
  reactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 7,
    gap: 4,
  },
  reactBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

export const publicReactionStyles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, overflow: 'hidden', height: 130, alignItems: 'stretch' },
  thumb: { width: 160, backgroundColor: colors.surfaceElevated, position: 'relative' },
  playIcon: { position: 'absolute', bottom: 8, left: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  campaignThumbOverlay: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  info: { flex: 1, paddingHorizontal: 14, gap: 6, justifyContent: 'center', alignItems: 'flex-start' },
  reactorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 28, height: 28 },
  avatarInitials: { fontSize: 10, fontWeight: '700', color: colors.textPrimary },
  reactorName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  campaignLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  time: { fontSize: 12, color: colors.textTertiary },
  tapHint: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
});

export const businessProfileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', letterSpacing: 1.2 },

  // Identity
  identitySkeleton: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  identityBlock: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 12 },
  avatarRing: { borderWidth: 3, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', position: 'relative', flexShrink: 0 },
  avatarFallback: { flex: 1, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.background },
  identityInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  displayName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, flexShrink: 1 },
  handle: { fontSize: 13, color: colors.textSecondary },
  bio: { fontSize: 13, color: colors.textTertiary, lineHeight: 18 },
  countsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  countText: { fontSize: 12 },
  countValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  countLabel: { fontSize: 12, color: colors.textSecondary },
  countDot: { fontSize: 12, color: colors.textTertiary },

  // Follow
  followRow: { paddingHorizontal: 16, paddingBottom: 12 },
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.primary },
  followingBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  followBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  followingBtnText: { color: colors.textPrimary },

  // Featured reactions
  featuredSection: { paddingBottom: 12, marginTop: 20 },
  featuredTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  // Tabs
  tabBar: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 4 },
  tabItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  tabUnderline: { height: 2, width: '100%', borderRadius: 1, backgroundColor: colors.primary },

  // Lists
  listContent: { paddingHorizontal: 16, paddingTop: 8, gap: 0 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
