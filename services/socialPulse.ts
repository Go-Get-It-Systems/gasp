import type { Gasp, LatestMoment } from '@/services/api/schemas/gasp.schema';

export const SOCIAL_PULSE_SECTION_ORDER = ['open', 'latest', 'reactions', 'activity'] as const;
export type SocialPulseSection = typeof SOCIAL_PULSE_SECTION_ORDER[number];

export function sortOpenNow(gasps: Gasp[]): Gasp[] {
  return [...gasps].sort((first, second) => {
    const timeDifference = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    return timeDifference !== 0 ? timeDifference : second.id.localeCompare(first.id);
  });
}

export function getPrivacySafeImageSource(blurhash: string | null | undefined): { blurhash: string } | undefined {
  return blurhash ? { blurhash } : undefined;
}

export function getLatestMomentCards(moment: LatestMoment | null | undefined): LatestMoment[] {
  return moment ? [moment] : [];
}
