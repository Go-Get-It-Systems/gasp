import { useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import type { BusinessCampaign } from '@/services/api/schemas/business.schema';
import { CampaignInputSchema } from '@/services/api/schemas/business.schema';
import { uploadWithRetry } from '@/services/uploadQueue';
import { useBusinessActor } from '@/hooks/queries/useBusiness';
import { useSaveCampaign } from '@/hooks/queries/useBusinessMutations';
import { useBusinessMedia } from '@/hooks/useBusinessMedia';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { BusinessButton, BusinessError, businessStyles } from './BusinessUI';
import { CampaignMedia } from './CampaignMedia';

export function CampaignForm({ workspaceId, campaign }: { workspaceId: string; campaign?: BusinessCampaign }) {
  const { t } = useTranslation();
  const actor = useBusinessActor();
  const save = useSaveCampaign(workspaceId, campaign?.id);
  const picker = useBusinessMedia();
  const [title, setTitle] = useState(campaign?.title ?? '');
  const [overlay, setOverlay] = useState(campaign?.textOverlay ?? '');
  const [replayable, setReplayable] = useState(campaign?.replayable ?? false);
  const [uploading, setUploading] = useState(false);
  const media = picker.media ?? (campaign ? { uri: campaign.mediaUrl, mediaType: campaign.mediaType } : undefined);
  const busy = uploading || save.isPending || picker.picking;
  const readOnly = !!campaign && campaign.state !== 'draft';
  async function submit() {
    if (busy || readOnly || !actor) return;
    if (!media || !title.trim() || title.trim().length > 120) { Alert.alert(t('common.error'), t('business.invalidCampaign')); return; }
    setUploading(true);
    try {
      // Actor-owned gasps uploads support all explicitly permitted owner workspaces.
      const url = picker.media ? (await uploadWithRetry(media.uri, 'gasps', actor)).downloadUrl : media.uri;
      const input = CampaignInputSchema.parse({ title, mediaUrl: url, mediaType: media.mediaType, textOverlay: overlay, replayable });
      await save.mutateAsync(input);
      router.back();
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert(t('common.error'), t('business.error'));
    } finally { setUploading(false); }
  }
  return <View style={businessStyles.section}>
    {media && <CampaignMedia uri={media.uri} mediaType={media.mediaType} />}
    <TextInput value={title} onChangeText={setTitle} maxLength={120} editable={!busy && !readOnly} placeholder={t('business.title')} placeholderTextColor={colors.textTertiary} style={businessStyles.input} accessibilityLabel={t('business.title')} accessibilityHint={t('business.invalidCampaign')} />
    <TextInput value={overlay} onChangeText={setOverlay} maxLength={5000} multiline editable={!busy && !readOnly} placeholder={t('business.overlay')} placeholderTextColor={colors.textTertiary} style={businessStyles.input} accessibilityLabel={t('business.overlay')} accessibilityHint={t('business.overlay')} />
    <View style={businessStyles.row}><Switch value={replayable} onValueChange={setReplayable} disabled={busy || readOnly} accessibilityLabel={t('business.replayable')} /><Text>{t('business.replayable')}</Text></View>
    <BusinessButton label={t('business.chooseMedia')} disabled={busy || readOnly} onPress={() => { void picker.pick(); }} />
    <BusinessButton label={t('business.captureMedia')} disabled={busy || readOnly} onPress={() => { void picker.pick(true); }} />
    <BusinessButton label={t('business.saveDraft')} disabled={busy || readOnly || !media || !title.trim()} onPress={() => { void submit(); }} />
    {readOnly && <Text style={businessStyles.muted}>{t('business.unavailable')}</Text>}
    <BusinessError visible={save.isError} />
  </View>;
}
