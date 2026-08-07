import { Pressable, View } from 'react-native';
import { Camera, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface ProfileAvatarEditorProps {
  uri: string | null;
  displayName: string;
  disabled?: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
}

export function ProfileAvatarEditor({
  uri,
  displayName,
  disabled = false,
  onChangePhoto,
  onRemovePhoto,
}: ProfileAvatarEditorProps) {
  const { t } = useTranslation();

  return (
    <View className="items-center gap-3">
      <Avatar
        uri={uri}
        size={104}
        initials={displayName}
        accessibilityLabel={t('profile.edit.avatarPreview')}
      />

      <Pressable
        onPress={onChangePhoto}
        disabled={disabled}
        className="flex-row items-center gap-2 rounded-xl bg-surface px-4 py-3"
        accessibilityLabel={t('profile.edit.changePhoto')}
        accessibilityHint={t('profile.edit.changePhotoHint')}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Camera size={18} color={colors.primary} />
        <Text variant="body" weight="600" color={colors.primary}>
          {t('profile.edit.changePhoto')}
        </Text>
      </Pressable>

      {uri ? (
        <Pressable
          onPress={onRemovePhoto}
          disabled={disabled}
          className="flex-row items-center gap-2 px-4 py-2"
          accessibilityLabel={t('profile.edit.removePhoto')}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <Trash2 size={16} color={colors.error} />
          <Text variant="caption" weight="600" color={colors.error}>
            {t('profile.edit.removePhoto')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
