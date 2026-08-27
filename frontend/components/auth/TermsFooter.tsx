import { Linking, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

export function TermsFooter() {
  return (
    <View style={styles.container}>
      <Text variant="caption" style={styles.text}>
        {'By continuing, you agree to our '}
        <Text
          variant="caption"
          style={styles.link}
          onPress={() => Linking.openURL('https://gasp.app/terms')}
          accessibilityRole="link"
        >
          {'Terms'}
        </Text>
        {' & '}
        <Text
          variant="caption"
          style={styles.link}
          onPress={() => Linking.openURL('https://gasp.app/privacy')}
          accessibilityRole="link"
        >
          {'Privacy Policy'}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  text: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  link: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'underline' as const,
  },
});
