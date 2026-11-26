/** Original campaign composer presentation from origin/feat/business-studio-local. */
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useCampaignPublishing } from '@/hooks/queries/useCampaignPublishing';
import { BusinessQuery } from './BusinessUI';
import { CampaignComposerMedia } from './CampaignComposerMedia';
import { CampaignPublished } from './CampaignPublished';
import { campaignComposerStyles as styles } from './campaignComposerStyles';

export function CampaignComposerScreen(props: { workspaceId?: string; mediaUri?: string; isVideo?: string }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const composer = useCampaignPublishing(props);
  const { title, setTitle, media, published, uploadStep, canPublish, isPending } = composer;
  const publishBtnLabel = t(uploadStep === 'uploading' ? 'business.uploadingMedia'
    : uploadStep === 'saving' ? 'business.publishing' : 'business.publishCampaign');

  if (published) return <CampaignPublished campaign={published} />;

  return <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.iconBtn} disabled={isPending}
        accessibilityRole="button" accessibilityLabel={t('business.back')} accessibilityState={{ disabled: isPending }}>
        <X size={22} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>{t('business.newCampaign')}</Text>
      <View style={styles.iconBtn} />
    </View>
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <CampaignComposerMedia media={media} disabled={isPending || composer.picking} onPress={composer.pickMedia} />
      <View style={styles.form}>
        <Text style={styles.label}>{t('business.title')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle}
          placeholder={t('business.campaignTitleExample')} placeholderTextColor={colors.textTertiary}
          maxLength={100} returnKeyType="done" editable={!isPending}
          accessibilityLabel={t('business.title')} accessibilityHint={t('business.campaignTitleHint')} />
        <Text style={styles.charCount}>{title.length}/100</Text>
      </View>
      <BusinessQuery query={composer.workspaces} empty={t('business.noLinkedBusiness')}>{() => composer.workspace ? null :
        <Text style={[styles.hint, { color: colors.error }]}>{t('business.workspaceUnavailable')}</Text>
      }</BusinessQuery>
      {composer.isError && <Text style={[styles.hint, { color: colors.error }]} accessibilityRole="alert">
        {t('business.publishErrorRetry')}
      </Text>}
      <Pressable style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]} onPress={composer.publish}
        disabled={!canPublish} accessibilityRole="button" accessibilityLabel={publishBtnLabel}
        accessibilityState={{ disabled: !canPublish, busy: isPending }}>
        {isPending ? <View style={styles.publishBtnInner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.publishBtnText}>{publishBtnLabel}</Text>
        </View> : <Text style={styles.publishBtnText}>{publishBtnLabel}</Text>}
      </Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}
