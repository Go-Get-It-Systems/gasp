const mockGenerate = jest.fn();
jest.mock('expo-image', () => ({ Image: { generateBlurhashAsync: (...args: unknown[]) => mockGenerate(...args) } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import { generatePreviewBlurhash } from '@/services/blurhash';

describe('generatePreviewBlurhash', () => {
  it('returns a small 4x3 blurhash for the local image', async () => {
    mockGenerate.mockResolvedValueOnce('LKO2?U%2Tw=w');
    await expect(generatePreviewBlurhash('file:///photo.jpg')).resolves.toBe('LKO2?U%2Tw=w');
    expect(mockGenerate).toHaveBeenCalledWith('file:///photo.jpg', [4, 3]);
  });

  it('never blocks a send when hashing fails', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('decode failed'));
    await expect(generatePreviewBlurhash('file:///broken.jpg')).resolves.toBeUndefined();
  });
});
