import {
  cacheMedia,
  cleanupExpired,
  clearAllCache,
  getCachedUri,
  getCacheSize,
  initCache,
} from '../mediaCache.web';

// Importing either native dependency must fail this suite: web and SSR cannot
// use Expo's native file paths or the persisted native file index.
jest.mock('expo-file-system', () => {
  throw new Error('Native file system must not load in the web media adapter');
});
jest.mock('@react-native-async-storage/async-storage', () => {
  throw new Error('Native cache index must not load in the web media adapter');
});

describe('browser media fallback', () => {
  it('initializes safely without native filesystem access and preserves signed URLs', async () => {
    await expect(initCache()).resolves.toBeUndefined();
    const url = 'https://media.example/video.mp4?signature=keep-this&expires=123';
    await expect(cacheMedia(url, '2030-01-01T00:00:00Z')).resolves.toBe(url);
    await expect(cacheMedia('', '2030-01-01T00:00:00Z')).resolves.toBe('');
    // Returning a URL must not falsely claim that an offline file was saved.
    expect(getCachedUri(url)).toBeNull();
    await expect(getCacheSize()).resolves.toBe(0);
  });

  it('allows cache settings and cleanup to run when there is no app-managed web cache', async () => {
    await expect(cleanupExpired()).resolves.toBe(0);
    await expect(clearAllCache()).resolves.toBeUndefined();
    await expect(getCacheSize()).resolves.toBe(0);
  });
});
