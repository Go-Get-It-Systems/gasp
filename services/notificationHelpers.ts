/**
 * Pure helper functions for the notification/awareness system.
 * No side effects, no imports of React or stores — safe to test in isolation.
 */

/** Returns the hex color for a given notification content type. */
export function resolveIndicatorColor(type: 'chat' | 'gasp' | 'reaction'): string {
  switch (type) {
    case 'chat':
      return '#7C3AED'; // primary purple
    case 'gasp':
      return '#EF4444'; // red — urgent/ephemeral
    case 'reaction':
      return '#06B6D4'; // cyan
  }
}

/**
 * Computes how much of the 24-hour gasp TTL has elapsed.
 * Returns a value in [0, 1] where 1.0 means fully expired.
 */
export function computeElapsedFraction(createdAt: string, now: number): number {
  'worklet';
  const TTL_MS = 86_400_000; // 24 hours
  const elapsed = now - Date.parse(createdAt);
  return Math.min(1.0, Math.max(0, elapsed / TTL_MS));
}

/**
 * Returns the ring stroke color based on how much of the TTL has elapsed.
 * Turns red when less than 1 hour (1/24) remains — i.e. fraction >= 23/24.
 */
export function resolveRingColor(fraction: number): string {
  'worklet';
  return fraction >= 23 / 24 ? '#EF4444' : '#7C3AED';
}

/** Formats the reminder push notification message for a gasp sender. */
export function formatReminderMessage(senderName: string): string {
  return `${senderName} is waiting for your reaction`;
}

/** Returns a human-readable delivery status label. Never returns empty string or throws. */
export function formatDeliveryStatus(
  status: 'sent' | 'delivered' | 'opened' | undefined
): string {
  switch (status) {
    case 'delivered':
      return 'Delivered';
    case 'opened':
      return 'Opened';
    case 'sent':
    default:
      return 'Sent';
  }
}

/** Returns true when there are pending gasps — used to drive pulse state. */
export function deriveInboxPulseState(pendingGasps: unknown[]): boolean {
  return pendingGasps.length > 0;
}
