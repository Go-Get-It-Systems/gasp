import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compressImage } from '@/services/imageCompression';
import * as usersApi from '@/services/api/users';
import { queryKeys } from '@/services/queryKeys';
import { uploadWithRetry, type UploadProgress } from '@/services/uploadQueue';
import type { UpdateProfileInput, User } from '@/services/api/schemas/user.schema';
import { useAuthStore } from '@/stores/authStore';
import { setUserData } from '@/utils/storage';
import { isTransientError } from './queryHelpers';

export type AvatarChange =
  | { kind: 'unchanged' }
  | { kind: 'selected'; uri: string }
  | { kind: 'removed' };

export interface UpdateProfileVariables {
  profile: Required<Pick<UpdateProfileInput, 'displayName' | 'username' | 'bio'>>;
  avatar: AvatarChange;
  onUploadProgress?: (progress: UploadProgress) => void;
}

/** Updates profile data and keeps the authenticated-user identity in sync. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profile, avatar, onUploadProgress }: UpdateProfileVariables) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('Cannot update profile without an authenticated user');

      let avatarUrl: string | null | undefined;
      if (avatar.kind === 'selected') {
        const compressedUri = await compressImage(avatar.uri);
        const upload = await uploadWithRetry(
          compressedUri,
          'avatars',
          currentUser.id,
          onUploadProgress,
        );
        avatarUrl = upload.downloadUrl;
      } else if (avatar.kind === 'removed') {
        avatarUrl = null;
      }

      return usersApi.updateMe({ ...profile, avatarUrl });
    },
    retry: (failureCount, error) => failureCount < 1 && isTransientError(error),
    retryDelay: 1500,
    onSuccess: async (updatedUser) => {
      useAuthStore.getState().setUser(updatedUser);
      await setUserData(JSON.stringify(updatedUser));

      queryClient.setQueryData<User>(queryKeys.users.me, updatedUser);
      queryClient.setQueryData<User>(queryKeys.users.profile(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}
