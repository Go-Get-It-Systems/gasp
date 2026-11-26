import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import { useBusinessActor, usePublicCampaigns } from '@/hooks/queries/useBusiness';
import { useSubmitCampaignReaction } from '@/hooks/queries/useBusinessMutations';
import { useBusinessMedia } from '@/hooks/useBusinessMedia';
import { uploadWithRetry } from '@/services/uploadQueue';
import { BusinessButton, BusinessError, BusinessScreen, businessStyles } from '@/components/business/BusinessUI';
import { CampaignMedia } from '@/components/business/CampaignMedia';
import { ReactionRecorder } from '@/components/business/ReactionRecorder';
import { ReactionConsent } from '@/components/business/ReactionConsent';

export default function CampaignReact() {
  const { workspaceId = '', campaignId = '' } = useLocalSearchParams<{ workspaceId: string; campaignId: string }>();
  const { t } = useTranslation();
  const actor = useBusinessActor();
  const campaigns = usePublicCampaigns(workspaceId);
  const original = campaigns.data?.find((c) => c.id === campaignId);
  const submit = useSubmitCampaignReaction(workspaceId, campaignId);
  const picker = useBusinessMedia(true);
  const [recording, setRecording] = useState(false);
  const [consent, setConsent] = useState(false); // Always fresh opt-in, including replacement reactions.
  const [uploading, setUploading] = useState(false);
  const busy = uploading || submit.isPending || picker.picking;
  async function send() {
    if (!picker.media || busy || !actor || !workspaceId || !campaignId || !original || campaigns.isError) return;
    setUploading(true);
    try {
      const { downloadUrl } = await uploadWithRetry(picker.media.uri, 'reactions', actor);
      await submit.mutateAsync({ videoUrl: downloadUrl, consentToFeature: consent });
      Alert.alert(t('business.reactionSent'));
      router.back();
    } catch (error) { Sentry.captureException(error); Alert.alert(t('common.error'), t('business.error')); }
    finally { setUploading(false); }
  }
  return <BusinessScreen title={t('business.react')}>
    {!!original && <CampaignMedia uri={original.mediaUrl} mediaType={original.mediaType} />}
    {recording ? <ReactionRecorder onCancel={() => setRecording(false)} onVideo={(uri) => { picker.setMedia({ uri, mediaType: 'video' }); setConsent(false); setRecording(false); }} /> : <View style={businessStyles.section}>
      {picker.media && <CampaignMedia uri={picker.media.uri} mediaType="video" />}
      <BusinessButton label={t('business.recordVideo')} disabled={busy} onPress={() => setRecording(true)} />
      <BusinessButton label={t('business.chooseVideo')} disabled={busy} onPress={() => { setConsent(false); void picker.pick(); }} />
      <ReactionConsent value={consent} onChange={setConsent} disabled={busy} />
      <BusinessButton label={t('business.sendReaction')} disabled={busy || !picker.media || !original || campaigns.isError} onPress={() => { void send(); }} />
      <BusinessError visible={submit.isError} />
    </View>}
  </BusinessScreen>;
}
