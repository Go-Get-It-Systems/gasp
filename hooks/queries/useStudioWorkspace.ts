import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyBusinesses } from '@/services/api/business';
import { businessQueryKeys, useBusinessStore } from '@/stores/businessStore';

/** A remembered selection is usable only while present in the owner's response. */
export function useStudioWorkspace() {
  const { activeWorkspace, setActiveWorkspace } = useBusinessStore();
  const query = useQuery({
    queryKey: businessQueryKeys.mine(),
    queryFn: getMyBusinesses,
    retry: false,
    staleTime: 60_000,
  });
  const workspaces = query.isError ? undefined : query.data;
  const workspace = workspaces?.find((row) => row.id === activeWorkspace?.id)
    ?? workspaces?.find((row) => row.isActive) ?? workspaces?.[0] ?? null;

  useEffect(() => {
    if (query.isSuccess || query.isError) setActiveWorkspace(workspace);
  }, [query.isSuccess, query.isError, workspace, setActiveWorkspace]);

  return {
    ...query, workspaces, workspace,
    selectWorkspace: (id: string) => {
      const selected = workspaces?.find((row) => row.id === id);
      if (selected) setActiveWorkspace(selected);
    },
  };
}
