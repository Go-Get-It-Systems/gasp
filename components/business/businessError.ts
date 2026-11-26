import { isAxiosError } from 'axios';

export function businessErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : fallback;
}
