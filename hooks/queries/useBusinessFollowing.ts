import { Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BusinessWorkspace } from '@/services/api/schemas/business.schema';
import { useBusinessProfile, useBusinessWorkspaces } from './useBusiness';
import { useBusinessFollow } from './useBusinessMutations';

export function useBusinessFollowing(handle: string, initialWorkspace?: BusinessWorkspace) {
  const { t } = useTranslation();
  const profile = useBusinessProfile(handle, !initialWorkspace);
  const own = useBusinessWorkspaces();
  const workspace = initialWorkspace ?? profile.data;
  const mutation = useBusinessFollow(workspace?.id ?? '');
  const isOwner = own.data?.some((row) => row.id === workspace?.id) ?? false;
  const isError = mutation.isError || own.isError || (!initialWorkspace && profile.isError);
  const isLoading = own.isLoading || (!initialWorkspace && profile.isLoading);
  const disabled = !workspace || isOwner || own.isLoading || own.isError
    || (!initialWorkspace && profile.isError) || mutation.isPending;
  function toggle(confirmUnfollow = false) {
    if (disabled || !workspace) return;
    if (!workspace.isFollowing || !confirmUnfollow) { mutation.mutate(!workspace.isFollowing); return; }
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('business.unfollowTitle')}\n\n${t('business.unfollowBody')}`)) mutation.mutate(false);
    } else {
      Alert.alert(t('business.unfollowTitle'), t('business.unfollowBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('business.unfollow'), style: 'destructive', onPress: () => mutation.mutate(false) },
      ]);
    }
  }
  return { workspace, isOwner, isError, isLoading, disabled, isPending: mutation.isPending, toggle };
}
