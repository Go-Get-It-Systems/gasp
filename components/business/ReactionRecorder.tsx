import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { BusinessButton, BusinessError, businessStyles } from './BusinessUI';

export function ReactionRecorder({ onVideo, onCancel }: { onVideo: (uri: string) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const camera = useRef<CameraView>(null);
  const [permission, requestCamera] = useCameraPermissions();
  const [microphone, requestMicrophone] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const focused = useIsFocused();
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; camera.current?.stopRecording(); }, []);
  useEffect(() => { if (!focused) camera.current?.stopRecording(); }, [focused]);
  async function record() {
    if (!ready || recording || !camera.current) return;
    setRecording(true); setError(false);
    try {
      const video = await camera.current.recordAsync({ maxDuration: 30 });
      if (mounted.current && video) onVideo(video.uri);
    } catch (failure) { Sentry.captureException(failure); if (mounted.current) setError(true); }
    finally { if (mounted.current) setRecording(false); }
  }
  async function permit() {
    try { await requestCamera(); await requestMicrophone(); }
    catch (failure) { Sentry.captureException(failure); setError(true); }
  }
  return <View style={businessStyles.section}>
    <Text style={businessStyles.muted}>{t('business.recordHint')}</Text>
    {permission?.granted && microphone?.granted && focused ? <>
      <CameraView ref={camera} style={{ height: 320, borderRadius: 18 }} facing="front" mode="video" onCameraReady={() => setReady(true)} />
      <BusinessButton label={t(recording ? 'business.stopRecording' : 'business.recordVideo')} disabled={!ready} onPress={() => { if (recording) camera.current?.stopRecording(); else void record(); }} />
    </> : <BusinessButton label={t('business.permissionTitle')} onPress={() => { void permit(); }} />}
    <BusinessButton label={t('common.cancel')} disabled={recording} onPress={onCancel} />
    <BusinessError visible={error} />
  </View>;
}
