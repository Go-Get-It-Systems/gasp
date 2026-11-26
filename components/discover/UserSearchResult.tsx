import { useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { UserPlus, Check, Clock } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { openFriendProfile } from '@/services/navigation';
import { BusinessSearchResult } from './BusinessSearchResult';
import type { User } from '@/services/api/schemas/user.schema';

export type RequestStatus = 'none' | 'sending' | 'sent' | 'already_friends';

interface UserSearchResultProps {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType?: User['accountType'];
  status: RequestStatus;
  onAdd: (id: string) => Promise<void>;
}

export function UserSearchResult(props: UserSearchResultProps) {
  return props.accountType === 'business' ? <BusinessSearchResult displayName={props.displayName} username={props.username} avatarUrl={props.avatarUrl} />
    : <PersonalSearchResult {...props} />;
}

function PersonalSearchResult({
  id,
  displayName,
  username,
  avatarUrl,
  status,
  onAdd,
}: UserSearchResultProps) {
  const [localStatus, setLocalStatus] = useState(status);

  const handleAdd = async () => {
    if (localStatus !== 'none') return;
    setLocalStatus('sending');
    try {
      await onAdd(id);
      setLocalStatus('sent');
    } catch {
      setLocalStatus('none');
    }
  };

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleOpenProfile = () => {
    openFriendProfile({ userId: id, displayName, avatarUrl });
  };

  return (
    <Pressable style={styles.container} onPress={handleOpenProfile} accessibilityLabel={`View ${displayName}'s profile`}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <Text variant="body" style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="caption" style={styles.username} numberOfLines={1}>
          @{username}
        </Text>
      </View>

      {localStatus === 'none' && (
        <Pressable style={styles.addButton} onPress={handleAdd} accessibilityLabel={`Add ${displayName}`} accessibilityRole="button">
          <UserPlus size={18} color="#FFFFFF" />
          <Text variant="caption" style={styles.addText}>
            {'Add'}
          </Text>
        </Pressable>
      )}

      {localStatus === 'sending' && (
        <View style={styles.statusButton}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {localStatus === 'sent' && (
        <View style={[styles.statusButton, styles.sentButton]}>
          <Clock size={16} color={colors.textSecondary} />
          <Text variant="caption" style={styles.sentText}>
            {'Sent'}
          </Text>
        </View>
      )}

      {localStatus === 'already_friends' && (
        <View style={[styles.statusButton, styles.friendsButton]}>
          <Check size={16} color={colors.success} />
          <Text variant="caption" style={styles.friendsText}>
            {'Friends'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 13,
    color: colors.textSecondary,
  },
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
  addText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  sentButton: {
    backgroundColor: colors.surface,
  },
  sentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  friendsButton: {
    backgroundColor: colors.surface,
  },
  friendsText: {
    fontSize: 13,
    color: colors.success,
  },
});
