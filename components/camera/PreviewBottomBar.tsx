import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { Download, RotateCcw, Send, Type } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface PreviewBottomBarProps {
  onRetake: () => void;
  onSend: () => void;
  onOpenText: () => void;
  onSave?: () => void;
  isSending: boolean;
  bottomInset: number;
  sendLabel?: string;
}

export function PreviewBottomBar({ onRetake, onSend, onOpenText, onSave, isSending, bottomInset, sendLabel }: PreviewBottomBarProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(200)}
      style={[styles.bottomBar, { paddingBottom: bottomInset + 16 }]}
    >
      <Pressable onPress={onRetake} style={styles.bottomAction} accessibilityLabel="Retake" accessibilityRole="button">
        <View style={styles.actionCircle}>
          <RotateCcw size={22} color="#FFFFFF" />
        </View>
        <Text variant="caption" style={styles.actionLabel}>Retake</Text>
      </Pressable>

      {onSave && (
        <Pressable onPress={onSave} style={styles.bottomAction} accessibilityLabel="Save to camera roll" accessibilityRole="button">
          <View style={styles.actionCircle}>
            <Download size={22} color="#FFFFFF" />
          </View>
          <Text variant="caption" style={styles.actionLabel}>Save</Text>
        </Pressable>
      )}

      <Pressable onPress={onSend} disabled={isSending} style={[styles.sendButton, isSending && { opacity: 0.6 }]} accessibilityLabel={sendLabel ?? 'Send'} accessibilityRole="button">
        {isSending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Send size={24} color="#FFFFFF" />
        )}
        <Text variant="body" style={styles.sendText}>{isSending ? 'Preparing...' : (sendLabel ?? 'Send')}</Text>
      </Pressable>

      <Pressable onPress={onOpenText} style={styles.bottomAction} accessibilityLabel="Add text" accessibilityRole="button">
        <View style={styles.actionCircle}>
          <Type size={22} color="#FFFFFF" />
        </View>
        <Text variant="caption" style={styles.actionLabel}>Text</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    zIndex: 10,
  },
  bottomAction: {
    alignItems: 'center',
    gap: 6,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
    borderCurve: 'continuous',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
});
