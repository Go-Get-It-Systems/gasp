const mockFiles = new Map<string, boolean>();
const mockDeleted: string[] = [];
const mockDownload = jest.fn();
jest.mock('@/services/privateMedia', () => ({ resolveMediaUri: jest.fn(async (url: string) => url + '?synthetic-grant') }));
jest.mock('expo-file-system', () => {
  class Directory {
    uri: string; exists = true;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/') + '/'; }
    create() { this.exists = true; }
    delete() { this.exists = false; }
  }
  class File {
    uri: string; size = 10;
    constructor(uri: string) { this.uri = uri; }
    get exists() { return mockFiles.get(this.uri) ?? false; }
    delete() { mockDeleted.push(this.uri); mockFiles.delete(this.uri); }
    move(target: File) { mockFiles.delete(this.uri); mockFiles.set(target.uri, true); this.uri = target.uri; }
    static downloadFileAsync(...args: unknown[]) { return mockDownload(...args); }
  }
  return { File, Directory, Paths: { cache: 'file:///cache' } };
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { cacheMedia, clearAllCache, getCachedUri, getCacheSize, initCache } from '@/services/mediaCache';
import { advanceSession } from '@/services/session';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const source = 'https://storage.googleapis.com/security-test-bucket/gasps/alice/photo.jpg';
beforeEach(async () => {
  jest.clearAllMocks(); advanceSession(); mockFiles.clear(); mockDeleted.length = 0;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  await clearAllCache(); jest.clearAllMocks();
});
describe('F07: native media cache races', () => {
  test('a late download is deleted instead of restoring a cache entry', async () => {
    let finish!: (file: File) => void;
    mockDownload.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const caching = cacheMedia(source, '2030-01-01T00:00:00Z'); await flush();
    expect(mockDownload).toHaveBeenCalled();
    advanceSession(); await clearAllCache();
    mockFiles.set('file:///late-download', true); finish(new File('file:///late-download'));
    expect(await caching).toBe(''); expect(getCachedUri(source)).toBeNull();
    expect(mockDeleted).toContain('file:///late-download'); expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
  test('a late persisted-index read cannot restore the previous session', async () => {
    let finish!: (value: string) => void;
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const loading = initCache(); advanceSession(); await clearAllCache();
    finish(JSON.stringify({ old: { localPath: 'file:///alice', expiresAt: '2030-01-01T00:00:00Z', sizeBytes: 500 } })); await loading;
    expect(await getCacheSize()).toBe(0);
  });
  test('current-session downloads still resolve and cache their local URI', async () => {
    mockFiles.set('file:///download', true); mockDownload.mockResolvedValueOnce(new File('file:///download'));
    const uri = await cacheMedia(source, '2030-01-01T00:00:00Z');
    expect(uri).toContain('session-'); expect(getCachedUri(source)).toBe(uri); expect(await getCacheSize()).toBe(10);
    await clearAllCache(); expect(getCachedUri(source)).toBeNull(); expect(AsyncStorage.removeItem).toHaveBeenCalledWith('gasp_media_cache_index');
  });
});
