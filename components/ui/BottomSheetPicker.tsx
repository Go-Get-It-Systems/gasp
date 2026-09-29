import { useCallback } from 'react';
import { StyleSheet, View, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Text } from './Text';
import { colors } from '@/constants/colors';

interface PickerOption<T extends string> {
  label: string;
  value: T;
}

interface BottomSheetPickerProps<T extends string> {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function BottomSheetPicker<T extends string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: BottomSheetPickerProps<T>) {
  const insets = useSafeAreaInsets();

  const handleSelect = useCallback(
    (value: T) => {
      onSelect(value);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <Text
            variant="subtitle"
            weight="bold"
            style={{ textAlign: 'center', marginBottom: 20, color: colors.textPrimary }}
          >
            {title}
          </Text>

          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={[styles.row, selected && styles.rowSelected]}
              >
                <Text
                  variant="body"
                  weight={selected ? '700' : '500'}
                  style={{ color: selected ? colors.textPrimary : colors.textSecondary, fontSize: 16 }}
                >
                  {option.label}
                </Text>
                {selected && (
                  <Check size={20} color={colors.primary} strokeWidth={3} />
                )}
              </Pressable>
            );
          })}

          <Pressable onPress={onClose} style={styles.cancelRow}>
            <Text variant="body" weight="600" style={{ color: colors.textTertiary }}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  rowSelected: {
    backgroundColor: `${colors.primary}12`,
  },
  cancelRow: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
