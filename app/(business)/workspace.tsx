import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessStore } from '@/stores/businessStore';
import { router } from 'expo-router';
import { ArrowLeft, Building2, CheckCircle2, LogOut, Users } from 'lucide-react-native';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Row component ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 24,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────

export default function WorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const { activeWorkspace, exitStudio } = useBusinessStore();
  const user = useAuthStore((s) => s.user);

  const handleExit = () => {
    exitStudio();
    router.replace('/(tabs)/profile');
  };

  if (!activeWorkspace) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{'Workspace'}</Text>
        </View>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{'Workspace not found.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 40,
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{'Workspace'}</Text>
      </View>

      {/* Identity card */}
      <View style={styles.identityCard}>
        {activeWorkspace.avatarUrl ? (
          <Image
            source={{ uri: activeWorkspace.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Building2 size={32} color={colors.primary} />
          </View>
        )}

        <View style={styles.identityInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {activeWorkspace.displayName}
            </Text>
            {activeWorkspace.isVerified && (
              <CheckCircle2 size={16} color={colors.primary} />
            )}
          </View>
          <Text style={styles.handle}>{'@' + activeWorkspace.handle}</Text>

          {activeWorkspace.bio && (
            <Text style={styles.bio} numberOfLines={3}>
              {activeWorkspace.bio}
            </Text>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'Workspace details'}</Text>
        <View style={styles.card}>
          <InfoRow label="Handle" value={'@' + activeWorkspace.handle} />
          <InfoRow
            label="Status"
            value={activeWorkspace.isActive ? 'Active' : 'Inactive'}
          />
          <InfoRow
            label="Verified"
            value={activeWorkspace.isVerified ? 'Yes' : 'No'}
          />
          <InfoRow
            label="Followers"
            value={activeWorkspace.followerCount.toString()}
          />
        </View>
      </View>

      {/* Role — owner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'Your role'}</Text>
        <View style={styles.roleCard}>
          <Users size={20} color={colors.primary} />
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{'Owner'}</Text>
            <Text style={styles.roleUser}>{user?.displayName ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Note: workspace provisioning is admin-only per R2.2 */}
      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          {
            'This workspace is managed by the platform administrator. Changes to identity, verification and members must be requested through support.'
          }
        </Text>
      </View>

      {/* Exit studio */}
      <Pressable onPress={handleExit} style={styles.exitButton}>
        <LogOut size={18} color={colors.error} />
        <Text style={styles.exitText}>{'Exit Business Studio'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  identityCard: {
    flexDirection: 'row',
    gap: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  handle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bio: {
    fontSize: 13,
    color: colors.textTertiary,
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleInfo: {
    gap: 2,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roleUser: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noteCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  exitText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
