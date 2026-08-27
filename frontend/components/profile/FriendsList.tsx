import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface FriendItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  onlineStatus: 'online' | 'offline' | 'away';
}

interface FriendsListProps {
  friends: FriendItem[];
  onFriendPress?: (id: string) => void;
}

export function FriendsList({ friends, onFriendPress }: FriendsListProps) {
  return (
    <View style={styles.container}>
      {friends.map((friend) => (
        <Pressable
          key={friend.id}
          onPress={() => onFriendPress?.(friend.id)}
          style={styles.friendItem}
        >
          <View style={styles.avatarContainer}>
            {friend.avatarUrl ? (
              <Image
                source={{ uri: friend.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text variant="caption" style={styles.initial}>
                  {friend.name.charAt(0)}
                </Text>
              </View>
            )}
            {friend.onlineStatus === 'online' ? (
              <View style={styles.onlineDot} />
            ) : null}
          </View>
          <Text variant="caption" style={styles.friendName} numberOfLines={1}>
            {friend.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  friendItem: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendName: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
