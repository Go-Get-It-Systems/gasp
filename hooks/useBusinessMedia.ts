import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Sentry from '@sentry/react-native';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export function useBusinessMedia(videoOnly = false) {
  const { t } = useTranslation();
  const [media, setMedia] = useState<{ uri: string; mediaType: 'image' | 'video' }>();
  const [picking, setPicking] = useState(false);
  async function pick(camera = false) {
    if (picking) return;
    setPicking(true);
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert(t('common.error'), t('business.permissionError')); return; }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: videoOnly ? ['videos'] : ['images', 'videos'], quality: 0.8, videoMaxDuration: 30 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset && (asset.type === 'image' || asset.type === 'video')) setMedia({ uri: asset.uri, mediaType: asset.type });
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert(t('common.error'), t('business.error'));
    } finally { setPicking(false); }
  }
  return { media, setMedia, picking, pick };
}
