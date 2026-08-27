import { buildCompositePayload, compositeReaction } from '../compositeService';
import { api } from '@/services/api';
import fc from 'fast-check';

jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockedApiPost = api.post as jest.MockedFunction<typeof api.post>;

describe('compositeService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Feature: super-imposed-reaction, Property 1: buildCompositePayload layout invariant
  describe('buildCompositePayload', () => {
    it('always returns layout="1/3-2/3" for any pair of string inputs', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (reactionVideoUrl, gaspUrl) => {
          const payload = buildCompositePayload(reactionVideoUrl, gaspUrl);
          expect(payload.layout).toBe('1/3-2/3');
        }),
        { numRuns: 100 },
      );
    });

    it('preserves the exact input URLs in the payload', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (reactionVideoUrl, gaspUrl) => {
          const payload = buildCompositePayload(reactionVideoUrl, gaspUrl);
          expect(payload.reactionVideoUrl).toBe(reactionVideoUrl);
          expect(payload.gaspUrl).toBe(gaspUrl);
        }),
        { numRuns: 100 },
      );
    });

    it('is pure — same inputs always produce same output', () => {
      const a = buildCompositePayload('https://cdn.example.com/reaction.mp4', 'https://cdn.example.com/gasp.jpg');
      const b = buildCompositePayload('https://cdn.example.com/reaction.mp4', 'https://cdn.example.com/gasp.jpg');
      expect(a).toEqual(b);
    });
  });

  describe('compositeReaction', () => {
    it('calls api.post with the correct endpoint, payload, and signal', async () => {
      const payload = buildCompositePayload(
        'https://cdn.example.com/reaction.mp4',
        'https://cdn.example.com/gasp.jpg',
      );
      const controller = new AbortController();
      const mockResult = { compositeUrl: 'https://cdn.example.com/composite.mp4' };

      mockedApiPost.mockResolvedValueOnce({ data: mockResult } as any);

      const result = await compositeReaction(payload, controller.signal);

      expect(mockedApiPost).toHaveBeenCalledWith(
        '/reactions/composite',
        payload,
        { signal: controller.signal },
      );
      expect(result).toEqual(mockResult);
    });

    it('rejects when the AbortSignal is aborted before the request resolves', async () => {
      const payload = buildCompositePayload(
        'https://cdn.example.com/reaction.mp4',
        'https://cdn.example.com/gasp.jpg',
      );
      const controller = new AbortController();

      // Mock api.post to never settle (simulates a hanging request)
      mockedApiPost.mockImplementationOnce(
        () => new Promise((_resolve, reject) => {
          // Listen for abort signal
          controller.signal.addEventListener('abort', () => {
            const abortError = new Error('AbortError');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
      );

      const compositePromise = compositeReaction(payload, controller.signal);
      controller.abort();

      await expect(compositePromise).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('returns the compositeUrl from the API response', async () => {
      const payload = buildCompositePayload(
        'https://cdn.example.com/reaction.mp4',
        'https://cdn.example.com/gasp.jpg',
      );
      const controller = new AbortController();
      const expected = { compositeUrl: 'https://cdn.example.com/output.mp4' };

      mockedApiPost.mockResolvedValueOnce({ data: expected } as any);

      const result = await compositeReaction(payload, controller.signal);
      expect(result.compositeUrl).toBe(expected.compositeUrl);
    });
  });
});
