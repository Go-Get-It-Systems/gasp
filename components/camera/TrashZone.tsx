import { View, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';

interface TrashZoneProps {
  isOverTrash: boolean;
  bottomInset: number;
}

export function TrashZone({ isOverTrash, bottomInset }: TrashZoneProps) {
  return (
    <View style={[styles.trashZone, { paddingBottom: bottomInset + 20 }]}>
      <View style={[styles.trashCircle, isOverTrash && styles.trashCircleActive]}>
        <Trash2 size={isOverTrash ? 28 : 22} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trashZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  trashCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  trashCircleActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
