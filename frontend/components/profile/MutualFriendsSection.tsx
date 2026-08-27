import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';

// TODO: Replace with real data when backend GET /users/:id returns mutualFriends
// See: memory/project_backend_todo_mutual_friends.md
const MOCK_MUTUAL_FRIENDS = [
  { id: '1', name: 'Ana', avatarUrl: null },
  { id: '2', name: 'Pedro', avatarUrl: null },
];
const MOCK_TOTAL = 5;

interface MutualFriendsSectionProps {
  friends?: Array<{ id: string; name: string; avatarUrl: string | null }>;
  totalCount?: number;
}

export function MutualFriendsSection({
  friends = MOCK_MUTUAL_FRIENDS,
  totalCount = MOCK_TOTAL,
}: MutualFriendsSectionProps) {
  const remaining = totalCount - friends.length;

  return (
    <View style={styles.container}>
      <Text variant="caption" style={styles.title}>MUTUAL FRIENDS</Text>
      <View style={styles.row}>
        <View style={styles.avatars}>
          {friends.map((f, i) => (
            <View key={f.id} style={[styles.avatarWrapper, i > 0 && { marginLeft: -8 }]}>
              <Avatar uri={f.avatarUrl} size={28} initials={f.name} />
            </View>
          ))}
        </View>
        <Text variant="caption" style={styles.names}>
          {friends.map(f => f.name).join(', ')}
          {remaining > 0 && ` +${remaining} more`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: 16,
  },
  names: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
});
