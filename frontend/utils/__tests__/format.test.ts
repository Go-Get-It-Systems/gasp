import { formatRelativeTime } from '@/utils/format';

describe('formatRelativeTime', () => {
  it('does not throw when a server timestamp is missing or invalid', () => {
    expect(formatRelativeTime('')).toBe('JUST NOW');
    expect(formatRelativeTime('not-a-date')).toBe('JUST NOW');
  });

  it('formats a recent valid timestamp', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('JUST NOW');
  });
});
