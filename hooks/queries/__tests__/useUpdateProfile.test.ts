import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateProfile, type UpdateProfileVariables } from '../useUpdateProfile';
import * as usersApi from '@/services/api/users';
import { compressImage } from '@/services/imageCompression';
import { uploadWithRetry } from '@/services/uploadQueue';
import { setUserData } from '@/utils/storage';

jest.mock('@/services/api/users', () => ({ updateMe: jest.fn() }));
jest.mock('@/services/imageCompression', () => ({ compressImage: jest.fn() }));
jest.mock('@/services/uploadQueue', () => ({ uploadWithRetry: jest.fn() }));
jest.mock('@/utils/storage', () => ({ setUserData: jest.fn() }));

const mockedUseMutation = useMutation as jest.Mock;
const mockedUseQueryClient = useQueryClient as jest.Mock;
const mockedUpdateMe = usersApi.updateMe as jest.MockedFunction<typeof usersApi.updateMe>;
const mockedCompressImage = compressImage as jest.MockedFunction<typeof compressImage>;
const mockedUploadWithRetry = uploadWithRetry as jest.MockedFunction<typeof uploadWithRetry>;
const mockedSetUserData = setUserData as jest.MockedFunction<typeof setUserData>;

const queryClient = { setQueryData: jest.fn(), invalidateQueries: jest.fn() };
const currentUser = {
  id: 'user-1', displayName: 'Alex', username: 'alex', avatarUrl: null, bio: '',
  createdAt: '2026-08-07T00:00:00.000Z',
};

describe('useUpdateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: currentUser, isAuthenticated: true });
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseMutation.mockImplementation((options) => options);
    mockedSetUserData.mockResolvedValue(undefined);
  });

  it('compresses and uploads a newly selected avatar before updating the profile', async () => {
    mockedCompressImage.mockResolvedValue('file:///compressed.webp');
    mockedUploadWithRetry.mockResolvedValue({
      downloadUrl: 'https://cdn.example.com/avatars/user-1.webp', storagePath: 'avatars/user-1.webp',
    });
    mockedUpdateMe.mockResolvedValue({
      ...currentUser, displayName: 'Alex Morgan', avatarUrl: 'https://cdn.example.com/avatars/user-1.webp',
    });
    const mutation = useUpdateProfile() as unknown as {
      mutationFn: (variables: UpdateProfileVariables) => Promise<unknown>;
    };
    const onUploadProgress = jest.fn();

    await mutation.mutationFn({
      profile: { displayName: 'Alex Morgan', username: 'alex', bio: 'Hello' },
      avatar: { kind: 'selected', uri: 'file:///original.jpg' }, onUploadProgress,
    });

    expect(mockedCompressImage).toHaveBeenCalledWith('file:///original.jpg');
    expect(mockedUploadWithRetry).toHaveBeenCalledWith('file:///compressed.webp', 'avatars', 'user-1', onUploadProgress);
    expect(mockedUpdateMe).toHaveBeenCalledWith({
      displayName: 'Alex Morgan', username: 'alex', bio: 'Hello', avatarUrl: 'https://cdn.example.com/avatars/user-1.webp',
    });
  });

  it('persists avatar removal as a null profile value', async () => {
    mockedUpdateMe.mockResolvedValue({ ...currentUser, bio: 'Hello' });
    const mutation = useUpdateProfile() as unknown as {
      mutationFn: (variables: UpdateProfileVariables) => Promise<unknown>;
    };

    await mutation.mutationFn({
      profile: { displayName: 'Alex', username: 'alex', bio: 'Hello' }, avatar: { kind: 'removed' },
    });

    expect(mockedUploadWithRetry).not.toHaveBeenCalled();
    expect(mockedUpdateMe).toHaveBeenCalledWith({
      displayName: 'Alex', username: 'alex', bio: 'Hello', avatarUrl: null,
    });
  });

  it('updates authenticated identity, persistent storage, and query caches after save', async () => {
    const updatedUser = { ...currentUser, displayName: 'Alex Morgan', bio: 'Hello' };
    const mutation = useUpdateProfile() as unknown as {
      onSuccess: (user: typeof updatedUser) => Promise<void>;
    };

    await mutation.onSuccess(updatedUser);

    expect(useAuthStore.getState().user).toEqual(updatedUser);
    expect(mockedSetUserData).toHaveBeenCalledWith(JSON.stringify(updatedUser));
    expect(queryClient.setQueryData).toHaveBeenCalledWith(['users', 'me'], updatedUser);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(['users', 'profile', 'user-1'], updatedUser);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['conversations'] });
  });
});
