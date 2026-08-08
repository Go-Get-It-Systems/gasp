import { useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/services/api';
import { useUpdateProfile, type AvatarChange } from '@/hooks/queries/useUpdateProfile';
import { useAuthStore } from '@/stores/authStore';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function isUsernameConflict(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'response' in error
    && (error as { response?: { status?: number } }).response?.status === 409;
}

/** Owns the local form and media-selection state for Edit Profile. */
export function useProfileEditor() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatar, setAvatar] = useState<AvatarChange>({ kind: 'unchanged' });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [usernameConflict, setUsernameConflict] = useState(false);

  const normalizedName = displayName.trim();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedBio = bio.trim();
  const validation = useMemo(() => ({
    displayName: normalizedName.length >= 1 && normalizedName.length <= 50,
    username: normalizedUsername.length >= 3
      && normalizedUsername.length <= 30
      && USERNAME_PATTERN.test(normalizedUsername),
    bio: normalizedBio.length <= 200,
  }), [normalizedBio.length, normalizedName.length, normalizedUsername]);

  const isSaving = updateProfile.isPending;
  const canSave = Boolean(user) && validation.displayName && validation.username && validation.bio;
  const avatarUri = avatar.kind === 'selected'
    ? avatar.uri
    : avatar.kind === 'removed'
      ? null
      : user?.avatarUrl ?? null;

  const handleChangePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('profile.edit.photoPermissionTitle'), t('profile.edit.photoPermissionBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.edit.openSettings'), onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      const selectedUri = result.canceled ? undefined : result.assets[0]?.uri;
      if (selectedUri) setAvatar({ kind: 'selected', uri: selectedUri });
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'profileEditor.changePhoto' } });
      Alert.alert(t('common.error'), t('profile.edit.photoSelectionError'));
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(t('profile.edit.removePhotoTitle'), t('profile.edit.removePhotoBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.edit.removePhoto'),
        style: 'destructive',
        onPress: () => setAvatar({ kind: 'removed' }),
      },
    ]);
  };

  const save = async (): Promise<boolean> => {
    setSubmitAttempted(true);
    setUsernameConflict(false);
    if (!canSave || !user || isSaving) return false;

    try {
      await updateProfile.mutateAsync({
        profile: { displayName: normalizedName, username: normalizedUsername, bio: normalizedBio },
        avatar,
        onUploadProgress: ({ progress }) => setUploadProgress(progress),
      });
      return true;
    } catch (error) {
      Sentry.captureException(error, { extra: { context: 'profileEditor.save' } });
      if (isUsernameConflict(error)) {
        setUsernameConflict(true);
      } else {
        Alert.alert(t('profile.edit.saveErrorTitle'), getApiErrorMessage(error));
      }
      return false;
    } finally {
      setUploadProgress(null);
    }
  };

  return {
    user,
    displayName,
    setDisplayName,
    username,
    setUsername: (value: string) => {
      setUsername(value.toLowerCase());
      setUsernameConflict(false);
    },
    bio,
    setBio,
    avatarUri,
    isSaving,
    canSave,
    uploadProgress,
    bioLength: bio.length,
    errors: {
      displayName: submitAttempted && !validation.displayName ? t('profile.edit.displayNameError') : undefined,
      username: usernameConflict
        ? t('profile.edit.usernameTaken')
        : submitAttempted && !validation.username ? t('profile.edit.usernameError') : undefined,
      bio: submitAttempted && !validation.bio ? t('profile.edit.bioError') : undefined,
    },
    changePhoto: handleChangePhoto,
    removePhoto: handleRemovePhoto,
    save,
  };
}
