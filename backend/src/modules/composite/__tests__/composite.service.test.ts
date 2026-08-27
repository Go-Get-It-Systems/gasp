import { describe, test, expect, vi, beforeEach, type MockInstance } from 'vitest';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

// ---------------------------------------------------------------------------
// Module mocks — declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      promises: {
        ...actual.promises,
        mkdtemp: vi.fn().mockResolvedValue('/tmp/composite-test123'),
        rm: vi.fn().mockResolvedValue(undefined),
        access: vi.fn().mockResolvedValue(undefined),
      },
      createWriteStream: vi.fn().mockReturnValue({
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        emit: vi.fn(),
      }),
      createReadStream: vi.fn().mockReturnValue(Readable.from(['mock-file-data'])),
    },
  };
});

vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

vi.mock('../../uploads/uploads.service.js', () => ({
  uploadStreamToStorage: vi.fn().mockResolvedValue({
    downloadUrl: 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/composites/user1/123_abc.mp4',
    storagePath: 'composites/user1/123_abc.mp4',
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import fs from 'fs';
import { spawn } from 'child_process';
import * as Sentry from '@sentry/node';
import { uploadStreamToStorage } from '../../uploads/uploads.service.js';
import { createComposite } from '../composite.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockSpawn(exitCode: number, stdout = '', stderr = '') {
  const proc = new EventEmitter() as ReturnType<typeof spawn>;
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  Object.assign(proc, { stdout: stdoutEmitter, stderr: stderrEmitter });

  setImmediate(() => {
    if (stdout) stdoutEmitter.emit('data', Buffer.from(stdout));
    if (stderr) stderrEmitter.emit('data', Buffer.from(stderr));
    proc.emit('close', exitCode);
  });

  return proc;
}

function makeFFprobeSpawn(duration: number) {
  return makeMockSpawn(
    0,
    JSON.stringify({ streams: [{ duration: String(duration) }] }),
  );
}

/**
 * Creates a fresh fetch response on every call.
 * Using mockImplementation (not mockResolvedValue) ensures that parallel
 * downloads each get their own ReadableStream instance and avoid "locked" errors.
 */
function fetchAlways(ok: boolean, status: number, contentType: string): typeof fetch {
  return vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status,
      headers: { get: (key: string) => (key === 'content-type' ? contentType : null) },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('mock'));
          controller.close();
        },
      }),
    }),
  ) as unknown as typeof fetch;
}

/**
 * Creates a fetch mock that returns different responses for sequential calls.
 * Useful when reaction and gasp have different MIME types.
 */
function fetchSequence(...responses: Array<[boolean, number, string]>): typeof fetch {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    const [ok, status, contentType] = responses[callCount % responses.length]!;
    callCount++;
    return Promise.resolve({
      ok,
      status,
      headers: { get: (key: string) => (key === 'content-type' ? contentType : null) },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('mock'));
          controller.close();
        },
      }),
    });
  }) as unknown as typeof fetch;
}

const mockLog = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
  level: 'info',
  silent: vi.fn(),
};

const baseInput = {
  reactionVideoUrl: 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/reactions/user1/reaction.mp4',
  gaspUrl: 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/gasps/user2/gasp.mp4',
  layout: '1/3-2/3' as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('composite.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default spawn: ffprobe returns 15s duration, ffmpeg succeeds
    (spawn as unknown as MockInstance).mockImplementation((cmd: string) => {
      if (cmd === 'ffprobe') return makeFFprobeSpawn(15);
      return makeMockSpawn(0, '', '');
    });
  });

  // -------------------------------------------------------------------------
  // download step
  // -------------------------------------------------------------------------

  describe('download step', () => {
    test('resolves compositeUrl when both inputs are video/mp4', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      const result = await createComposite('user1', baseInput, mockLog as never);
      expect(result.compositeUrl).toContain('storage.googleapis.com');
    });

    test('calls ffprobe for reaction duration when gasp is image/jpeg', async () => {
      let ffprobeCalled = false;

      (spawn as unknown as MockInstance).mockImplementation((cmd: string) => {
        if (cmd === 'ffprobe') {
          ffprobeCalled = true;
          return makeFFprobeSpawn(10);
        }
        return makeMockSpawn(0);
      });

      global.fetch = fetchSequence(
        [true, 200, 'video/mp4'],  // reaction
        [true, 200, 'image/jpeg'], // gasp
      );

      await createComposite('user1', baseInput, mockLog as never);
      expect(ffprobeCalled).toBe(true);
    });

    test('throws unreachable_input and captures Sentry when fetch returns 404', async () => {
      global.fetch = fetchAlways(false, 404, 'video/mp4');

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toMatchObject({
        code: 'unreachable_input',
        statusCode: 422,
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'unreachable_input' }),
        expect.objectContaining({
          extra: expect.objectContaining({ step: 'download' }),
          tags: { feature: 'composite-service' },
        }),
      );
    });

    test('throws unreachable_input when fetch rejects (network error)', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('ECONNREFUSED'),
      ) as unknown as typeof fetch;

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toMatchObject({
        code: 'unreachable_input',
        statusCode: 422,
      });
    });

    test('throws invalid_media_type and captures Sentry when Content-Type is text/plain', async () => {
      global.fetch = fetchAlways(true, 200, 'text/plain');

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toMatchObject({
        code: 'invalid_media_type',
        statusCode: 422,
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'invalid_media_type' }),
        expect.objectContaining({
          extra: expect.objectContaining({ step: 'download' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // ffmpeg step
  // -------------------------------------------------------------------------

  describe('ffmpeg step', () => {
    test('calls spawn with ffmpeg and correct encoding args', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      await createComposite('user1', baseInput, mockLog as never);

      const calls = (spawn as unknown as MockInstance).mock.calls as [string, string[]][];
      const ffmpegCall = calls.find(([cmd]) => cmd === 'ffmpeg');
      expect(ffmpegCall).toBeDefined();

      const args = ffmpegCall![1];
      expect(args).toContain('-filter_complex');
      expect(args).toContain('libx264');
      expect(args).toContain('fast');
      expect(args).toContain('aac');
      expect(args.some((a) => a.endsWith('assets/gasp-watermark-white.png'))).toBe(true);

      const filterIndex = args.indexOf('-filter_complex');
      const filterGraph = args[filterIndex + 1]!;
      expect(filterGraph).toContain('[2:v]scale=64:64');
      expect(filterGraph).toContain('colorchannelmixer=aa=0.70');
      expect(filterGraph).toContain('main_w-overlay_w-24:main_h-overlay_h-36');
      expect(filterGraph).toContain('eof_action=repeat:repeatlast=1');
    });

    test('adds -loop 1 -t <duration> args when gasp is image', async () => {
      global.fetch = fetchSequence(
        [true, 200, 'video/mp4'],
        [true, 200, 'image/png'],
      );

      await createComposite('user1', baseInput, mockLog as never);

      const calls = (spawn as unknown as MockInstance).mock.calls as [string, string[]][];
      const ffmpegCall = calls.find(([cmd]) => cmd === 'ffmpeg');
      const args = ffmpegCall![1];
      expect(args).toContain('-loop');
      expect(args).toContain('1');
      expect(args).toContain('-t');
    });

    test('does NOT add -loop for video gasp', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      await createComposite('user1', baseInput, mockLog as never);

      const calls = (spawn as unknown as MockInstance).mock.calls as [string, string[]][];
      const ffmpegCall = calls.find(([cmd]) => cmd === 'ffmpeg');
      const args = ffmpegCall![1];
      expect(args).not.toContain('-loop');
    });

    test('throws COMPOSITE_FAILED and captures Sentry when ffmpeg exits with code 1', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      (spawn as unknown as MockInstance).mockImplementation((cmd: string) => {
        if (cmd === 'ffprobe') return makeFFprobeSpawn(15);
        return makeMockSpawn(1, '', 'Error: codec not found');
      });

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toMatchObject({
        code: 'COMPOSITE_FAILED',
        statusCode: 500,
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'COMPOSITE_FAILED' }),
        expect.objectContaining({
          extra: expect.objectContaining({ step: 'ffmpeg' }),
          tags: { feature: 'composite-service' },
        }),
      );
    });

    test('fails instead of returning an unwatermarked composite when the asset is missing', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');
      (fs.promises.access as unknown as MockInstance).mockRejectedValueOnce(
        new Error('ENOENT'),
      );

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toMatchObject({
        code: 'COMPOSITE_FAILED',
        statusCode: 500,
      });

      expect(uploadStreamToStorage).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'COMPOSITE_FAILED' }),
        expect.objectContaining({
          extra: expect.objectContaining({ step: 'ffmpeg' }),
          tags: { feature: 'composite-service' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // createComposite lifecycle
  // -------------------------------------------------------------------------

  describe('createComposite lifecycle', () => {
    test('calls uploadStreamToStorage with type: composites', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      await createComposite('user1', baseInput, mockLog as never);

      expect(uploadStreamToStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'composites',
          contentType: 'video/mp4',
          userId: 'user1',
        }),
      );
    });

    test('calls fs.rm in finally even when ffmpeg fails', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      (spawn as unknown as MockInstance).mockImplementation((cmd: string) => {
        if (cmd === 'ffprobe') return makeFFprobeSpawn(15);
        return makeMockSpawn(1, '', 'fatal error');
      });

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toThrow();

      expect(fs.promises.rm).toHaveBeenCalledWith(
        '/tmp/composite-test123',
        { recursive: true, force: true },
      );
    });

    test('calls fs.rm in finally on successful completion', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      await createComposite('user1', baseInput, mockLog as never);

      expect(fs.promises.rm).toHaveBeenCalledWith(
        '/tmp/composite-test123',
        { recursive: true, force: true },
      );
    });

    test('captures Sentry with step: upload when uploadStreamToStorage throws', async () => {
      global.fetch = fetchAlways(true, 200, 'video/mp4');

      (uploadStreamToStorage as unknown as MockInstance).mockRejectedValueOnce(
        new Error('Firebase unavailable'),
      );

      await expect(createComposite('user1', baseInput, mockLog as never)).rejects.toThrow(
        'Firebase unavailable',
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({ step: 'upload' }),
          tags: { feature: 'composite-service' },
        }),
      );
    });
  });
});
