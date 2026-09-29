import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor';
import { ProfileEditField } from '@/components/profile/ProfileEditField';
import { Text } from '@/components/ui/Text';
import { useProfileEditor } from '@/hooks/useProfileEditor';
import { colors } from '@/constants/colors';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const editor = useProfileEditor();

  if (!editor.user) return null;

  const handleSave = async () => {
    if (await editor.save()) router.back();
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center justify-between px-3 pb-4 pt-7">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full"
          accessibilityLabel={t('profile.edit.back')}
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text variant="subtitle" weight="700">{t('profile.edit.title')}</Text>
        <View className="w-11" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-10" keyboardShouldPersistTaps="handled">
        <ProfileAvatarEditor
          uri={editor.avatarUri}
          displayName={editor.displayName.trim()}
          disabled={editor.isSaving}
          onChangePhoto={editor.changePhoto}
          onRemovePhoto={editor.removePhoto}
        />
        <ProfileEditField
          label={t('profile.edit.displayName')}
          value={editor.displayName}
          onChangeText={editor.setDisplayName}
          placeholder={t('profile.edit.displayNamePlaceholder')}
          error={editor.errors.displayName}
          maxLength={50}
          autoCapitalize="words"
        />
        <ProfileEditField
          label={t('profile.edit.username')}
          value={editor.username}
          onChangeText={editor.setUsername}
          placeholder={t('profile.edit.usernamePlaceholder')}
          error={editor.errors.username}
          maxLength={30}
        />
        <ProfileEditField
          label={t('profile.edit.bio')}
          value={editor.bio}
          onChangeText={editor.setBio}
          placeholder={t('profile.edit.bioPlaceholder')}
          error={editor.errors.bio}
          maxLength={200}
          multiline
          accessibilityHint={t('profile.edit.bioHint', { count: editor.bioLength })}
        />
        {editor.uploadProgress !== null ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t('profile.edit.uploadingPhoto', { percent: Math.round(editor.uploadProgress * 100) })}
          </Text>
        ) : null}
        <Pressable
          onPress={handleSave}
          disabled={!editor.canSave || editor.isSaving}
          className="items-center rounded-2xl bg-primary px-5 py-4"
          style={{ opacity: !editor.canSave || editor.isSaving ? 0.5 : 1 }}
          accessibilityLabel={t('profile.edit.save')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !editor.canSave || editor.isSaving, busy: editor.isSaving }}
        >
          <Text variant="body" weight="700">
            {editor.isSaving ? t('profile.edit.saving') : t('profile.edit.save')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
