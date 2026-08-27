import { formatDistanceToNowStrict } from 'date-fns';

/**
 * Format a date into a short relative time string like "JUST NOW", "2M", "1H", "3D"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'JUST NOW';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return 'JUST NOW';
  }

  const distance = formatDistanceToNowStrict(date, { addSuffix: false });

  // Convert "X minutes" -> "XM", "X hours" -> "XH", etc.
  const parts = distance.split(' ');
  if (parts.length >= 2) {
    const value = parts[0];
    const unit = parts[1];

    if (unit.startsWith('second')) return 'JUST NOW';
    if (unit.startsWith('minute')) return `${value}M`;
    if (unit.startsWith('hour')) return `${value}H`;
    if (unit.startsWith('day')) return `${value}D`;
    if (unit.startsWith('month')) return `${value}MO`;
    if (unit.startsWith('year')) return `${value}Y`;
  }

  return distance.toUpperCase();
}

/**
 * Format a number with K/M suffix for large numbers
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}
