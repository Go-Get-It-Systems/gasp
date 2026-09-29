import { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Check, X, UserCheck } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import type { FriendRequest } from '@/services/api/friends';

interface PendingRequestsProps {
  requests: FriendRequest[];
  onAccept: (friendshipId: string) => Promise<void>;
  onReject: (friendshipId: string) => Promise<void>;
}

export function PendingRequests({
  requests,
  onAccept,
  onReject,
}: PendingRequestsProps) {
  if (requests.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UserCheck size={20} color={colors.accentCyan} />
        <Text variant="body" style={styles.headerText}>
          {'Friend Requests'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{requests.length}</Text>
        </View>
      </View>

      {requests.map((req) => (
        <RequestItem
          key={req.friendshipId}
          request={req}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </View>
  );
}

function RequestItem({
  request,
  onAccept,
  onReject,
}: {
  request: FriendRequest;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [handled, setHandled] = useState<'accepted' | 'rejected' | null>(null);

  const name = request.requester.displayName ?? '';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept(request.friendshipId);
      setHandled('accepted');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(request.friendshipId);
      setHandled('rejected');
    } finally {
      setIsLoading(false);
    }
  };

  if (handled) {
    return (
      <View style={styles.item}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text variant="body" style={styles.name}>
            {name}
          </Text>
          <Text variant="caption" style={styles.username}>
            @{request.requester.username}
          </Text>
        </View>
        <Text
          variant="caption"
          style={[
            styles.handledText,
            handled === 'accepted' ? styles.acceptedText : styles.rejectedText,
          ]}
        >
          {handled === 'accepted' ? 'Accepted' : 'Rejected'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.item}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text variant="body" style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" style={styles.username} numberOfLines={1}>
          @{request.requester.username}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={handleAccept}>
            <Check size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.rejectButton} onPress={handleReject}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handledText: {
    fontSize: 13,
    fontWeight: '600',
  },
  acceptedText: {
    color: colors.success,
  },
  rejectedText: {
    color: colors.textTertiary,
  },
});
