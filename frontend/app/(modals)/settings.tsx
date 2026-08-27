import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useMediaCacheStore } from '@/stores/mediaCacheStore';
import { clearAllCache, getCacheSize } from '@/services/mediaCache';
import { colors } from '@/constants/colors';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { BottomSheetPicker } from '@/components/ui/BottomSheetPicker';
import { ArrowLeft, LogOut, ChevronRight, User, Bell, Lock, CircleHelp, Shield, Trash2 } from 'lucide-react-native';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

type AutoDownloadPref = 'wifi' | 'wifi_and_cellular' | 'never';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const {
    autoDownloadPhotos,
    autoDownloadVideos,
    cacheSize,
    setAutoDownloadPhotos,
    setAutoDownloadVideos,
    setCacheSize,
  } = useMediaCacheStore();

  const [pickerType, setPickerType] = useState<'photos' | 'videos' | null>(null);
  const downloadOptions: { label: string; value: AutoDownloadPref }[] = [
    { label: t('settings.storage.wifiOnly'), value: 'wifi' },
    { label: t('settings.storage.wifiAndData'), value: 'wifi_and_cellular' },
    { label: t('settings.storage.never'), value: 'never' },
  ];
  const preferenceLabels: Record<AutoDownloadPref, string> = {
    wifi: t('settings.storage.wifiOnly'),
    wifi_and_cellular: t('settings.storage.wifiAndData'),
    never: t('settings.storage.never'),
  };

  useEffect(() => {
    getCacheSize()
      .then((size) => setCacheSize(size))
      .catch((error) => Sentry.captureException(error, { extra: { context: 'settings.getCacheSize' } }));
  }, [setCacheSize]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      t('settings.storage.clearCache'),
      t('settings.storage.clearCacheBody', { size: formatBytes(cacheSize) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.storage.clear'),
          style: 'destructive',
          onPress: async () => {
            await clearAllCache();
            setCacheSize(0);
          },
        },
      ],
    );
  }, [cacheSize, setCacheSize, t]);

  const handleLogout = async () => {
    try {
      await logout();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      setTimeout(() => {
        router.replace('/(auth)/welcome');
      }, 100);
    } catch (e) {
      Sentry.captureException(e, { extra: { context: 'settings.logout' } });
    }
  };

  const menuItems = [
    { id: 'account', icon: User, label: t('settings.account.title'), color: colors.primary, onPress: () => router.push('/(modals)/settings-account') },
    { id: 'notifications', icon: Bell, label: t('settings.notifications.title'), color: colors.accentPink, onPress: () => router.push('/(modals)/settings-notifications') },
    { id: 'privacy', icon: Lock, label: t('settings.privacy.title'), color: colors.accentCyan, onPress: () => router.push('/(modals)/settings-privacy') },
    { id: 'help', icon: CircleHelp, label: t('settings.help.title'), color: colors.warning, onPress: () => router.push('/(modals)/settings-help') },
    { id: 'about', icon: Shield, label: t('settings.about.title'), color: colors.success, onPress: () => router.push('/(modals)/settings-about') },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={24} color={colors.textPrimary} />}
          onPress={() => router.back()}
          accessibilityLabel={t('settings.back')}
        />
        <Text variant="title" weight="bold">{t('settings.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        {user && (
          <View style={styles.profileCard}>
            <Avatar uri={user.avatarUrl} size={64} initials={user.displayName} />
            <View style={styles.profileInfo}>
              <Text variant="subtitle" weight="bold">{user.displayName || t('settings.guest')}</Text>
              <Text variant="body" color={colors.textSecondary}>@{user.username || t('settings.guestUsername')}</Text>
            </View>
          </View>
        )}

        {/* Storage & Data */}
        <Text style={styles.sectionHeader}>{t('settings.storage.title')}</Text>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setPickerType('photos')} accessibilityLabel={t('settings.storage.photos')} accessibilityRole="button">
            <Text variant="body" weight="500">{t('settings.storage.photos')}</Text>
            <View style={styles.prefBadge}>
              <Text variant="caption" weight="600" color={colors.primary}>
                {preferenceLabels[autoDownloadPhotos]}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setPickerType('videos')} accessibilityLabel={t('settings.storage.videos')} accessibilityRole="button">
            <Text variant="body" weight="500">{t('settings.storage.videos')}</Text>
            <View style={styles.prefBadge}>
              <Text variant="caption" weight="600" color={colors.primary}>
                {preferenceLabels[autoDownloadVideos]}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Text variant="body" weight="500">{t('settings.storage.cachedData')}</Text>
            <Text variant="body" color={colors.textSecondary}>{formatBytes(cacheSize)}</Text>
          </View>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={handleClearCache} accessibilityLabel={t('settings.storage.clearCache')} accessibilityRole="button">
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${colors.accentPink}15` }]}>
                <Trash2 size={18} color={colors.accentPink} />
              </View>
              <Text variant="body" weight="500" color={colors.accentPink}>{t('settings.storage.clearCache')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionHeader}>{t('settings.controlsTitle')}</Text>
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={item.onPress}
                accessibilityLabel={item.label}
                accessibilityRole="button"
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                    <Icon size={20} color={item.color} />
                  </View>
                  <Text variant="body" weight="500">{item.label}</Text>
                </View>
                <ChevronRight size={20} color={colors.borderLight} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actionSection}>
          <Button
            variant="secondary"
            size="lg"
            onPress={handleLogout}
            leftIcon={<LogOut size={20} color={colors.error} />}
            className="w-full"
          >
            <Text color={colors.error} weight="bold">{t('settings.logOut')}</Text>
          </Button>
        </View>
      </ScrollView>

      {/* Bottom Sheet Picker */}
      <BottomSheetPicker
        visible={pickerType === 'photos'}
        title={t('settings.storage.photoAutoDownload')}
        options={downloadOptions}
        selectedValue={autoDownloadPhotos}
        onSelect={setAutoDownloadPhotos}
        onClose={() => setPickerType(null)}
      />

      <BottomSheetPicker
        visible={pickerType === 'videos'}
        title={t('settings.storage.videoAutoDownload')}
        options={downloadOptions}
        selectedValue={autoDownloadVideos}
        onSelect={setAutoDownloadVideos}
        onClose={() => setPickerType(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 20 : 32,
    paddingBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  prefBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionSection: {
    marginTop: 8,
  },
});
