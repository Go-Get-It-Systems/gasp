import * as Sentry from '@sentry/react-native';
import { api } from '@/services/api';
import { Dimensions } from 'react-native';

export interface CompositePayload {
  reactionVideoUrl: string;
  gaspUrl: string;
  layout: 'vertical-50-50';
  outputAspectRatio: number;
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
 * The vertical export uses the same equal panels and canvas shape as the preview.
 * Feature: super-imposed-reaction
 */
export function buildCompositePayload(
  reactionVideoUrl: string,
  gaspUrl: string,
  revealOffsetMs?: number,
  outputAspectRatio = 9 / 19.5,
): CompositePayload {
  const payload: CompositePayload = {
    reactionVideoUrl, gaspUrl, layout: 'vertical-50-50',
    outputAspectRatio: Number.isFinite(outputAspectRatio)
      ? Math.min(1, Math.max(0.4, outputAspectRatio)) : 9 / 19.5,
  };
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
  try {
    const response = await api.post<CompositeResult>('/reactions/composite', payload, { signal });
    return response.data;
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: { error?: string } } })?.response;
    // A rolling deployment may still reach the previous server. Preserve the
    // complete legacy composite instead of silently sending only the face.
    if (response?.status !== 400 || response.data?.error !== 'unsupported_layout' || signal.aborted) throw error;
    const { outputAspectRatio: _outputAspectRatio, ...legacyPayload } = payload;
    const fallback = await api.post<CompositeResult>(
      '/reactions/composite', { ...legacyPayload, layout: '1/3-2/3' }, { signal },
    );
    return fallback.data;
  }
}

/**
 * The reaction URL to send to the gasp's sender: the server composite (face
 * below the gasp, watermarked, in sync) when it succeeds, otherwise
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
    const viewport = Dimensions.get('window');
    const { compositeUrl } = await compositeReaction(
      buildCompositePayload(reactionVideoUrl, gaspUrl, revealOffsetMs, viewport.width / viewport.height),
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
