import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { clsx } from 'clsx';

export interface SearchBarProps {
  /** Current input value */
  value: string;
  /** Text change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** NativeWind class names */
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  className,
}: SearchBarProps) {
  const hasText = value.length > 0;

  return (
    <View className={clsx(className)} style={styles.container}>
      <Search size={18} color="#6B7280" style={styles.searchIcon} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search"
      />

      {hasText ? (
        <Pressable
          onPress={() => onChangeText('')}
          style={styles.clearButton}
          hitSlop={8}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <View style={styles.clearCircle}>
            <X size={12} color="#0A0A0F" />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    height: '100%',
    padding: 0,
  },
  clearButton: {
    flexShrink: 0,
  },
  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
