import { StyleSheet, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, MessageCircle, Clock, Check, X, UserPlus } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

export type FriendshipStatus = 'friends' | 'request_sent' | 'request_received' | 'none';

interface FriendActionButtonsProps {
  status: FriendshipStatus;
  onSendGasp: () => void;
  onChat: () => void;
  onAddFriend: () => void;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
  isProcessing?: boolean;
}

const GRADIENT: [string, string] = ['#7C3AED', '#EC4899'];
const ICON_SIZE = 18;
const ICON_COLOR = '#FFFFFF';

export function FriendActionButtons({
  status,
  onSendGasp,
  onChat,
  onAddFriend,
  onAcceptRequest,
  onDeclineRequest,
  isProcessing = false,
}: FriendActionButtonsProps) {
  if (status === 'friends') {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.flex}
          onPress={onSendGasp}
          accessibilityLabel="Send Gasp"
          accessibilityRole="button"
          disabled={isProcessing}
        >
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
            <Camera size={ICON_SIZE} color={ICON_COLOR} />
            <Text style={styles.gradientButtonText}>Send Gasp</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={[styles.flex, styles.outlineButton]}
          onPress={onChat}
          accessibilityLabel="Chat"
          accessibilityRole="button"
          disabled={isProcessing}
        >
          <MessageCircle size={ICON_SIZE} color={colors.textPrimary} />
          <Text style={styles.outlineButtonText}>Chat</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'request_sent') {
    return (
      <View style={styles.container}>
        <View style={[styles.disabledButton, styles.flex]}>
          <Clock size={ICON_SIZE} color={colors.textSecondary} />
          <Text style={styles.disabledButtonText}>Request Sent</Text>
        </View>
      </View>
    );
  }

  if (status === 'request_received') {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.flex}
          onPress={onAcceptRequest}
          accessibilityLabel="Accept friend request"
          accessibilityRole="button"
          disabled={isProcessing}
        >
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
            <Check size={ICON_SIZE} color={ICON_COLOR} />
            <Text style={styles.gradientButtonText}>Accept</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={[styles.flex, styles.outlineButton]}
          onPress={onDeclineRequest}
          accessibilityLabel="Decline friend request"
          accessibilityRole="button"
          disabled={isProcessing}
        >
          <X size={ICON_SIZE} color={colors.textPrimary} />
          <Text style={styles.outlineButtonText}>Decline</Text>
        </Pressable>
      </View>
    );
  }

  // status === 'none'
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.flex}
        onPress={onAddFriend}
        accessibilityLabel="Add friend"
        accessibilityRole="button"
        disabled={isProcessing}
      >
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
          <UserPlus size={ICON_SIZE} color={ICON_COLOR} />
          <Text style={styles.gradientButtonText}>Add Friend</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
  },
  flex: {
    flex: 1,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
  },
  gradientButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  disabledButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
