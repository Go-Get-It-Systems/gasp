jest.mock('@/services/storage', () => ({ uploadMedia: jest.fn() }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processQueue, clearUploadQueue, uploadWithRetry, enqueueUpload } from '@/services/uploadQueue';
import { uploadMedia } from '@/services/storage';
import { advanceSession, setSessionActor } from '@/services/session';
const item = (userId: string) => ({ id: userId, uri: `file:///${userId}.jpg`, type: 'gasps', userId, status: 'pending', attempts: 0, createdAt: 0 });
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
beforeEach(async () => { advanceSession(); setSessionActor('bob'); await AsyncStorage.clear(); jest.clearAllMocks(); (uploadMedia as jest.Mock).mockResolvedValue({ downloadUrl: 'synthetic' }); });
describe('F07: queued uploads cannot cross accounts', () => {
  test('only items belonging to the current account are uploaded', async () => {
    await AsyncStorage.setItem('gasp_upload_queue', JSON.stringify([item('alice'), item('bob')]));
    await processQueue();
    expect(uploadMedia).toHaveBeenCalledTimes(1); expect(uploadMedia).toHaveBeenCalledWith('file:///bob.jpg', 'gasps', 'bob');
  });
  test('a late A upload does not block B or restore A queue entries', async () => {
    advanceSession(); setSessionActor('alice'); let finish!: () => void;
    (uploadMedia as jest.Mock).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    await AsyncStorage.setItem('gasp_upload_queue', JSON.stringify([item('alice')]));
    const old = processQueue(); await flush(); expect(uploadMedia).toHaveBeenCalledTimes(1);
    advanceSession(); setSessionActor('bob'); await clearUploadQueue();
    await AsyncStorage.setItem('gasp_upload_queue', JSON.stringify([item('bob')]));
    await processQueue(); expect(uploadMedia).toHaveBeenCalledTimes(2);
    finish(); await old;
    expect(JSON.parse((await AsyncStorage.getItem('gasp_upload_queue')) ?? '[]')).toEqual([]);
  });
  test('foreground retry stops as soon as its originating session ends', async () => {
    let fail!: (error: Error) => void;
    (uploadMedia as jest.Mock).mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    const uploading = uploadWithRetry('file:///bob.jpg', 'gasps', 'bob').catch(error => error);
    advanceSession(); setSessionActor('charlie'); fail(new Error('offline'));
    expect((await uploading).name).toBe('StaleSessionError'); expect(uploadMedia).toHaveBeenCalledTimes(1);
  });
  test('a late queue read cannot persist an entry after account change', async () => {
    let finish!: (value: string) => void;
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const queuing = enqueueUpload('file:///bob.jpg', 'gasps', 'bob').catch(error => error);
    advanceSession(); setSessionActor('charlie'); finish('[]');
    expect((await queuing).name).toBe('StaleSessionError'); expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
