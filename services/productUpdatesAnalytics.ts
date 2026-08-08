import type { ProductUpdateStatus } from '@/services/api/schemas/productUpdate.schema';
import * as Sentry from '@sentry/react-native';

export type ProductUpdatesEvent =
  | { name: 'product_updates_opened'; source: 'profile'; unread_count: number }
  | { name: 'product_update_viewed'; update_id: string; status: ProductUpdateStatus; position: number }
  | { name: 'product_update_cta_tapped'; update_id: string; cta_label: string }
  | { name: 'product_update_feedback_submitted'; update_id: string; helpful: boolean };

export function trackProductUpdatesEvent(event: ProductUpdatesEvent): void {
  if (__DEV__) {
    Sentry.addBreadcrumb({ category: 'product_updates', message: event.name, data: event });
  }
}
