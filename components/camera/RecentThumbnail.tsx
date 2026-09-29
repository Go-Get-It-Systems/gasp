import { StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ImageIcon } from 'lucide-react-native';

interface RecentThumbnailProps {
  uri: string | null;
  onPress?: () => void;
}

export function RecentThumbnail({ uri, onPress }: RecentThumbnailProps) {
  if (!uri) {
    return (
      <Pressable onPress={onPress} style={styles.placeholder}>
        <ImageIcon size={22} color="rgba(255,255,255,0.5)" />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  placeholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
