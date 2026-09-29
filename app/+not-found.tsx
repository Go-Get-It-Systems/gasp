import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0A0A0F',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: '600',
          marginBottom: 16,
        }}
      >
        Screen not found
      </Text>
      <Text
        style={{
          color: '#9CA3AF',
          fontSize: 14,
          marginBottom: 24,
        }}
      >
        The page you're looking for doesn't exist.
      </Text>
      <Link href="/" style={{ color: '#7C3AED', fontSize: 16 }}>
        Go back home
      </Link>
    </View>
  );
}
