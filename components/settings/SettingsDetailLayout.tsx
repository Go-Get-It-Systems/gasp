import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface SettingsDetailLayoutProps {
  title: string;
  backLabel: string;
  children: ReactNode;
}

export function SettingsDetailLayout({ title, backLabel, children }: SettingsDetailLayoutProps) {
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center px-3 pb-4 pt-7">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full"
          accessibilityLabel={backLabel}
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text variant="subtitle" weight="700" className="flex-1 text-center">{title}</Text>
        <View className="w-11" />
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-10" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}
