import { api } from '@/services/api';

export interface CompositePayload {
  reactionVideoUrl: string;
  gaspUrl: string;
  layout: '1/3-2/3';
}

export interface CompositeResult {
  compositeUrl: string;
}

/**
 * Pure function: always returns layout="1/3-2/3" regardless of input order or call count.
 * Feature: super-imposed-reaction
 */
export function buildCompositePayload(
  reactionVideoUrl: string,
  gaspUrl: string,
): CompositePayload {
  return { reactionVideoUrl, gaspUrl, layout: '1/3-2/3' };
}

/**
 * Request a server-side composite video.
 * Caller must pass a signal from an AbortController with an 8 000 ms timeout.
 */
export async function compositeReaction(
  payload: CompositePayload,
  signal: AbortSignal,
): Promise<CompositeResult> {
  const response = await api.post<CompositeResult>(
    '/reactions/composite',
    payload,
    { signal },
  );
  return response.data;
}
