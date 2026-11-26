import { Stack, router } from 'expo-router';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
      />
    </ErrorBoundary>
  );
}
