import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
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

const DOWNLOAD_OPTIONS: { label: string; value: AutoDownloadPref }[] = [
  { label: 'WiFi Only', value: 'wifi' },
  { label: 'WiFi & Mobile Data', value: 'wifi_and_cellular' },
  { label: 'Never', value: 'never' },
];

const PREF_LABELS: Record<string, string> = {
  wifi: 'WiFi Only',
  wifi_and_cellular: 'WiFi & Data',
  never: 'Never',
};

export default function SettingsScreen() {
  const router = useRouter();
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

  useEffect(() => {
    getCacheSize().then((size) => setCacheSize(size));
  }, [setCacheSize]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      `Clear all cached media? This will free up ${formatBytes(cacheSize)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllCache();
            setCacheSize(0);
          },
        },
      ],
    );
  }, [cacheSize, setCacheSize]);

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
    { id: 'account', icon: User, label: 'Account Settings', color: colors.primary, onPress: () => router.push('/(modals)/edit-profile') },
    { id: 'notifications', icon: Bell, label: 'Notifications', color: colors.accentPink },
    { id: 'privacy', icon: Lock, label: 'Privacy & Security', color: colors.accentCyan },
    { id: 'help', icon: CircleHelp, label: 'Help & Support', color: colors.warning },
    { id: 'about', icon: Shield, label: 'About', color: colors.success },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={24} color={colors.textPrimary} />}
          onPress={() => router.back()}
        />
        <Text variant="title" weight="bold">Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        {user && (
          <View style={styles.profileCard}>
            <Avatar uri={user.avatarUrl} size={64} initials={user.displayName} />
            <View style={styles.profileInfo}>
              <Text variant="subtitle" weight="bold">{user.displayName || 'Guest'}</Text>
              <Text variant="body" color={colors.textSecondary}>@{user.username || 'guest'}</Text>
            </View>
          </View>
        )}

        {/* Storage & Data */}
        <Text style={styles.sectionHeader}>STORAGE & DATA</Text>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setPickerType('photos')}>
            <Text variant="body" weight="500">Photos</Text>
            <View style={styles.prefBadge}>
              <Text variant="caption" weight="600" color={colors.primary}>
                {PREF_LABELS[autoDownloadPhotos]}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setPickerType('videos')}>
            <Text variant="body" weight="500">Videos</Text>
            <View style={styles.prefBadge}>
              <Text variant="caption" weight="600" color={colors.primary}>
                {PREF_LABELS[autoDownloadVideos]}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Text variant="body" weight="500">Cached Data</Text>
            <Text variant="body" color={colors.textSecondary}>{formatBytes(cacheSize)}</Text>
          </View>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={handleClearCache}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${colors.accentPink}15` }]}>
                <Trash2 size={18} color={colors.accentPink} />
              </View>
              <Text variant="body" weight="500" color={colors.accentPink}>Clear Cache</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
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
                disabled={!item.onPress}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: !item.onPress }}
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
            <Text color={colors.error} weight="bold">Log Out</Text>
          </Button>
        </View>
      </ScrollView>

      {/* Bottom Sheet Picker */}
      <BottomSheetPicker
        visible={pickerType === 'photos'}
        title="Photos Auto-Download"
        options={DOWNLOAD_OPTIONS}
        selectedValue={autoDownloadPhotos}
        onSelect={setAutoDownloadPhotos}
        onClose={() => setPickerType(null)}
      />

      <BottomSheetPicker
        visible={pickerType === 'videos'}
        title="Videos Auto-Download"
        options={DOWNLOAD_OPTIONS}
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
