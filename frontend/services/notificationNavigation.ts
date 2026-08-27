import { router } from 'expo-router';

export function openNotificationRoute(route: string) {
  router.push(route as any);
}
