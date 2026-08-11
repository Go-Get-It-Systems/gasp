import { StyleSheet, View, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserMinus, ShieldOff, Flag } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useTranslation } from 'react-i18next';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  isFriend: boolean;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}

export function ProfileMenu({ visible, onClose, isFriend, onRemoveFriend, onBlock, onReport }: ProfileMenuProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {isFriend && (
            <Pressable
              style={styles.menuItem}
              onPress={() => { onRemoveFriend?.(); onClose(); }}
              accessibilityLabel={t('friendRequest.removeFriend')}
              accessibilityRole="button"
            >
              <UserMinus size={20} color={colors.error} />
              <Text variant="body" style={[styles.menuText, { color: colors.error }]}>{t('friendRequest.removeFriend')}</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.menuItem}
            onPress={() => { onBlock?.(); onClose(); }}
            accessibilityLabel={t('safety.block.confirm')}
            accessibilityRole="button"
          >
            <ShieldOff size={20} color={colors.textSecondary} />
            <Text variant="body" style={styles.menuText}>{t('safety.block.confirm')}</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => { onReport?.(); onClose(); }}
            accessibilityLabel={t('safety.report.title')}
            accessibilityRole="button"
          >
            <Flag size={20} color={colors.textSecondary} />
            <Text variant="body" style={styles.menuText}>{t('safety.report.title')}</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.menuItem} onPress={onClose} accessibilityLabel={t('common.cancel')} accessibilityRole="button">
            <Text variant="body" style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 24,
    marginVertical: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
});
