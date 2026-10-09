import * as Sentry from '@sentry/react-native';
import { api } from '@/services/api';

export interface CompositePayload {
  reactionVideoUrl: string;
  gaspUrl: string;
  layout: '1/3-2/3';
  /** ms of reaction recorded before the gasp was revealed (countdown) */
  revealOffsetMs?: number;
}

export interface CompositeResult {
  compositeUrl: string;
}

/** Server-side ffmpeg on short clips; generous so slow uploads still finish. */
export const COMPOSITE_TIMEOUT_MS = 60_000;
const MAX_REVEAL_OFFSET_MS = 10_000;

/**
 * Pure function: always returns layout="1/3-2/3" regardless of input order or call count.
 * Feature: super-imposed-reaction
 */
export function buildCompositePayload(
  reactionVideoUrl: string,
  gaspUrl: string,
  revealOffsetMs?: number,
): CompositePayload {
  const payload: CompositePayload = { reactionVideoUrl, gaspUrl, layout: '1/3-2/3' };
  if (revealOffsetMs !== undefined && Number.isFinite(revealOffsetMs)) {
    payload.revealOffsetMs = Math.round(Math.min(MAX_REVEAL_OFFSET_MS, Math.max(0, revealOffsetMs)));
  }
  return payload;
}

/**
 * Request a server-side composite video.
 * Caller must pass a signal from an AbortController.
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

/**
 * The reaction URL to send to the gasp's sender: the server composite (face
 * and gasp side by side, watermarked, in sync) when it succeeds, otherwise
 * the raw reaction video so the reaction is never lost.
 */
export async function resolveReactionMediaUrl(
  reactionVideoUrl: string,
  gaspUrl: string,
  revealOffsetMs?: number,
  timeoutMs = COMPOSITE_TIMEOUT_MS,
): Promise<string> {
  // A local file URI (cache fallback) is not something the server can fetch.
  if (!/^https:\/\//.test(gaspUrl)) return reactionVideoUrl;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { compositeUrl } = await compositeReaction(
      buildCompositePayload(reactionVideoUrl, gaspUrl, revealOffsetMs),
      controller.signal,
    );
    return compositeUrl || reactionVideoUrl;
  } catch (e) {
    Sentry.captureException(e, {
      tags: { feature: 'super-imposed-reaction', step: 'composite' },
      extra: { timedOut: controller.signal.aborted },
    });
    return reactionVideoUrl;
  } finally {
    clearTimeout(timer);
  }
}
