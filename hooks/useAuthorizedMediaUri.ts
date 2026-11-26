import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { isPrivateMediaUrl, resolveMediaUri } from '@/services/privateMedia';
import { getSessionGeneration } from '@/services/session';

export function useAuthorizedMediaUri(uri?: string | null): string | null {
  const actor = useAuthStore(s => s.user?.id);
  const generation = getSessionGeneration();
  const privateMedia = isPrivateMediaUrl(uri);
  const [resolved, setResolved] = useState<{ key: string; uri: string } | null>(null);
  const key = `${generation}:${uri ?? ''}`;
  useEffect(() => {
    if (!privateMedia || !uri || !actor) return;
    let active = true;
    const refresh = () => {
      void resolveMediaUri(uri).then(value => {
        if (active && generation === getSessionGeneration()) setResolved({ key, uri: value });
      }).catch(() => { if (active) setResolved(null); });
    };
    refresh();
    const timer = setInterval(refresh, 45_000);
    return () => { active = false; clearInterval(timer); };
  }, [uri, actor, privateMedia, generation, key]);
  if (!privateMedia) return uri ?? null;
  return actor && resolved?.key === key ? resolved.uri : null;
}
