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

describe('reveal offset and fallback', () => {
  const { resolveReactionMediaUrl } = jest.requireActual('../compositeService') as typeof import('../compositeService');

  afterEach(() => jest.clearAllMocks());

  it('includes a clamped, rounded revealOffsetMs when given', () => {
    expect(buildCompositePayload('r', 'g', 2999.6).revealOffsetMs).toBe(3000);
    expect(buildCompositePayload('r', 'g', -5).revealOffsetMs).toBe(0);
    expect(buildCompositePayload('r', 'g', 60_000).revealOffsetMs).toBe(10_000);
    expect(buildCompositePayload('r', 'g')).not.toHaveProperty('revealOffsetMs');
  });

  it('returns the composite URL when the server composes the reaction', async () => {
    mockedApiPost.mockResolvedValueOnce({ data: { compositeUrl: 'https://cdn/composites/c.mp4' } } as never);
    await expect(resolveReactionMediaUrl('https://cdn/reactions/r.mp4', 'https://cdn/gasps/g.jpg', 3000))
      .resolves.toBe('https://cdn/composites/c.mp4');
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/reactions/composite',
      expect.objectContaining({ revealOffsetMs: 3000, gaspUrl: 'https://cdn/gasps/g.jpg' }),
      expect.anything(),
    );
  });

  it('falls back to the raw reaction when compositing fails', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('403'));
    await expect(resolveReactionMediaUrl('https://cdn/reactions/r.mp4', 'https://cdn/gasps/g.jpg'))
      .resolves.toBe('https://cdn/reactions/r.mp4');
  });

  it('skips compositing when the gasp URL is a local file', async () => {
    await expect(resolveReactionMediaUrl('https://cdn/reactions/r.mp4', 'file:///cache/g.jpg'))
      .resolves.toBe('https://cdn/reactions/r.mp4');
    expect(mockedApiPost).not.toHaveBeenCalled();
  });
});
