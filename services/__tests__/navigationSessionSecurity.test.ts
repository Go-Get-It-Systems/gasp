jest.mock('@/services/mediaCache', () => ({ cacheMedia: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
import { router } from 'expo-router';
import { cacheMedia } from '@/services/mediaCache';
import { openGaspViewer } from '@/services/navigation';
import { advanceSession } from '@/services/session';
beforeEach(() => { jest.clearAllMocks(); advanceSession(); });
test('F07: a download finishing after logout cannot reopen the old private viewer', async () => {
  let finish!: (uri: string) => void;
  (cacheMedia as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const opening = openGaspViewer({ imageUri: 'https://storage.example.invalid/private.jpg', senderName: 'Alice' });
  advanceSession(); finish('file:///alice-private.jpg'); await opening;
  expect(router.push).not.toHaveBeenCalled();
});
test('current-session viewing keeps the stable reference for server compositing', async () => {
  const reference = 'https://storage.example.invalid/private.jpg';
  (cacheMedia as jest.Mock).mockResolvedValueOnce('file:///current.jpg');
  await openGaspViewer({ imageUri: reference, senderName: 'Alice' });
  expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ chatImageUri: 'file:///current.jpg', chatGaspUrl: reference }) }));
});
