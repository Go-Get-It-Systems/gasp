import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Stack, router } from 'expo-router';

export default function ModalsLayout() {
  return (
    <ErrorBoundary compact onGoHome={() => router.back()}>
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
          contentStyle: { backgroundColor: '#0A0A0F' },
          animation: 'slide_from_bottom',
        }}
      >
        {/* Fullscreen viewers — override modal presentation */}
        <Stack.Screen
          name="campaign-reaction-full"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            contentStyle: { backgroundColor: '#000' },
          }}
        />
        <Stack.Screen
          name="campaign-reaction-viewer"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            contentStyle: { backgroundColor: '#000' },
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
