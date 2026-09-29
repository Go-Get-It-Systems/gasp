import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabBarIconProps {
  icon: LucideIcon;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function TabBarIcon({
  icon: Icon,
  label,
  focused,
  onPress,
  onLongPress,
}: TabBarIconProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, {
      damping: 15,
      stiffness: 400,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          gap: 4,
        },
        animatedStyle,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label} tab`}
    >
      <Icon
        size={22}
        color={focused ? '#FFFFFF' : '#6B7280'}
        strokeWidth={focused ? 2.2 : 1.8}
      />

      <Text
        style={{
          color: focused ? '#FFFFFF' : '#6B7280',
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>

      {focused && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            marginTop: 2,
            // @ts-ignore - experimental_backgroundImage for gradient dot
            experimental_backgroundImage:
              'linear-gradient(135deg, #7C3AED, #EC4899)',
            backgroundColor: '#7C3AED',
          }}
        />
      )}

      {!focused && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            marginTop: 2,
            backgroundColor: 'transparent',
          }}
        />
      )}
    </AnimatedPressable>
  );
}
