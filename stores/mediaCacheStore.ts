import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AutoDownloadPref = 'wifi' | 'wifi_and_cellular' | 'never';

interface MediaCacheState {
  autoDownloadPhotos: AutoDownloadPref;
  autoDownloadVideos: AutoDownloadPref;
  cacheSize: number;
  isInitialized: boolean;

  setAutoDownloadPhotos: (pref: AutoDownloadPref) => void;
  setAutoDownloadVideos: (pref: AutoDownloadPref) => void;
  setCacheSize: (bytes: number) => void;
  loadPreferences: () => Promise<void>;
  shouldAutoDownload: (mediaType: 'image' | 'video', connectionType: string) => boolean;
}

const STORAGE_KEY = 'gasp_media_cache_prefs';

interface PersistedPrefs {
  autoDownloadPhotos: AutoDownloadPref;
  autoDownloadVideos: AutoDownloadPref;
}

const savePrefs = async (prefs: PersistedPrefs) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

export const useMediaCacheStore = create<MediaCacheState>((set, get) => ({
  autoDownloadPhotos: 'wifi',
  autoDownloadVideos: 'wifi',
  cacheSize: 0,
  isInitialized: false,

  setAutoDownloadPhotos: (pref) => {
    set({ autoDownloadPhotos: pref });
    const { autoDownloadVideos } = get();
    savePrefs({ autoDownloadPhotos: pref, autoDownloadVideos });
  },

  setAutoDownloadVideos: (pref) => {
    set({ autoDownloadVideos: pref });
    const { autoDownloadPhotos } = get();
    savePrefs({ autoDownloadPhotos, autoDownloadVideos: pref });
  },

  setCacheSize: (bytes) => set({ cacheSize: bytes }),

  loadPreferences: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const prefs: PersistedPrefs = JSON.parse(raw);
      set({
        autoDownloadPhotos: prefs.autoDownloadPhotos,
        autoDownloadVideos: prefs.autoDownloadVideos,
        isInitialized: true,
      });
    } else {
      set({ isInitialized: true });
    }
  },

  shouldAutoDownload: (mediaType, connectionType) => {
    const { autoDownloadPhotos, autoDownloadVideos } = get();
    const pref = mediaType === 'image' ? autoDownloadPhotos : autoDownloadVideos;

    if (pref === 'never') return false;
    if (pref === 'wifi') return connectionType === 'wifi';
    if (pref === 'wifi_and_cellular') return connectionType === 'wifi' || connectionType === 'cellular';

    return false;
  },
}));
