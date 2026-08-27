import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import type { FastifyBaseLogger } from 'fastify';
import * as Sentry from '@sentry/node';
import { AppError } from '../../shared/errors.js';
import { uploadStreamToStorage } from '../uploads/uploads.service.js';
import type { CompositeInput } from './composite.schemas.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const WATERMARK_PATH = path.resolve(process.cwd(), 'assets', 'gasp-watermark-white.png');

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface CompositeResult {
  compositeUrl: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extFromMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? 'bin';
}

/**
 * Downloads both input assets to `tmpDir`.
 * Validates HTTP status and Content-Type header.
 * Streams directly to disk — never buffers full video in memory.
 */
async function downloadInputs(
  tmpDir: string,
  reactionVideoUrl: string,
  gaspUrl: string,
): Promise<{ reactionPath: string; gaspPath: string; isGaspImage: boolean }> {
  async function downloadOne(url: string, baseName: string): Promise<{ filePath: string; mime: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeoutId);
      throw new AppError(422, 'One or more input URLs could not be fetched', 'unreachable_input');
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(422, 'One or more input URLs could not be fetched', 'unreachable_input');
    }

    const contentType = response.headers.get('content-type') ?? '';
    // Strip parameters like "; charset=utf-8"
    const mime = (contentType.split(';')[0] ?? '').trim().toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new AppError(422, `Unsupported media type: ${mime}`, 'invalid_media_type');
    }

    const ext = extFromMime(mime);
    const filePath = path.join(tmpDir, `${baseName}.${ext}`);

    if (!response.body) {
      throw new AppError(422, 'One or more input URLs could not be fetched', 'unreachable_input');
    }

    await pipeline(Readable.fromWeb(response.body as import('stream/web').ReadableStream), fs.createWriteStream(filePath));

    return { filePath, mime };
  }

  const [reactionResult, gaspResult] = await Promise.all([
    downloadOne(reactionVideoUrl, 'reaction'),
    downloadOne(gaspUrl, 'gasp'),
  ]);

  return {
    reactionPath: reactionResult.filePath,
    gaspPath: gaspResult.filePath,
    isGaspImage: gaspResult.mime.startsWith('image/'),
  };
}

/**
 * Probes the duration of a video file using ffprobe.
 * Returns duration in seconds as a number.
 */
async function probeVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('ffprobe failed'));
      }
      try {
        const data = JSON.parse(stdout) as { streams?: Array<{ duration?: string }> };
        const duration = parseFloat(data.streams?.[0]?.duration ?? '0');
        resolve(isNaN(duration) ? 0 : duration);
      } catch {
        reject(new Error('Failed to parse ffprobe output'));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Runs the FFmpeg composition pipeline.
 * Returns the path to the output file.
 */
async function runFFmpeg(
  tmpDir: string,
  reactionPath: string,
  gaspPath: string,
  isGaspImage: boolean,
  log: FastifyBaseLogger,
): Promise<string> {
  const outputPath = path.join(tmpDir, 'output.mp4');

  try {
    await fs.promises.access(WATERMARK_PATH, fs.constants.R_OK);
  } catch (err) {
    log.error({ err, watermarkPath: WATERMARK_PATH }, 'Watermark asset is unavailable');
    throw new AppError(500, 'FFmpeg processing failed', 'COMPOSITE_FAILED');
  }

  const filterComplex = [
    '[0:v]scale=360:1920:force_original_aspect_ratio=decrease,pad=360:1920:(ow-iw)/2:(oh-ih)/2[rv]',
    '[1:v]scale=720:1920:force_original_aspect_ratio=decrease,pad=720:1920:(ow-iw)/2:(oh-ih)/2[gv]',
    '[rv][gv]hstack=inputs=2[stacked]',
    '[2:v]scale=64:64,format=rgba,split=2[wm-shadow-source][wm-source]',
    '[wm-shadow-source]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.35[wm-shadow]',
    '[wm-source]colorchannelmixer=aa=0.70[wm]',
    '[stacked][wm-shadow]overlay=main_w-overlay_w-23:main_h-overlay_h-35:eof_action=repeat:repeatlast=1[with-shadow]',
    '[with-shadow][wm]overlay=main_w-overlay_w-24:main_h-overlay_h-36:eof_action=repeat:repeatlast=1[out]',
  ].join(';');

  // Build argument list
  const args: string[] = [];

  // Input 0: reaction video (always first)
  args.push('-i', reactionPath);

  // Input 1: gasp (loop if image)
  if (isGaspImage) {
    const duration = await probeVideoDuration(reactionPath);
    args.push('-loop', '1', '-t', String(duration));
  }
  args.push('-i', gaspPath);

  // Input 2: required, transparent G! watermark.
  args.push('-i', WATERMARK_PATH);

  // Filter graph
  args.push('-filter_complex', filterComplex);

  // Output mappings
  args.push('-map', '[out]');
  args.push('-map', '0:a?');   // audio from reaction video, optional

  // Encoding
  args.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-r', '30',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',         // overwrite output without prompting
    outputPath,
  );

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        log.error({ ffmpegStderr: stderr.slice(-2000) }, 'FFmpeg exited with non-zero code');
        return reject(new AppError(500, 'FFmpeg processing failed', 'COMPOSITE_FAILED'));
      }
      resolve(outputPath);
    });

    proc.on('error', (err) => {
      log.error({ err }, 'Failed to spawn FFmpeg process');
      reject(new AppError(500, 'FFmpeg processing failed', 'COMPOSITE_FAILED'));
    });
  });
}

// ---------------------------------------------------------------------------
// Exported main function
// ---------------------------------------------------------------------------

export async function createComposite(
  reactorId: string,
  input: CompositeInput,
  log: FastifyBaseLogger,
): Promise<CompositeResult> {
  const { reactionVideoUrl, gaspUrl } = input;

  // Create per-request temp directory
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'composite-'));

  try {
    // Step 1: Download inputs
    let reactionPath: string;
    let gaspPath: string;
    let isGaspImage: boolean;

    try {
      ({ reactionPath, gaspPath, isGaspImage } = await downloadInputs(tmpDir, reactionVideoUrl, gaspUrl));
    } catch (err) {
      Sentry.captureException(err, {
        extra: { reactionVideoUrl, gaspUrl, step: 'download' },
        tags: { feature: 'composite-service' },
      });
      throw err;
    }

    // Step 2: Run FFmpeg
    let outputPath: string;
    try {
      outputPath = await runFFmpeg(tmpDir, reactionPath, gaspPath, isGaspImage, log);
    } catch (err) {
      Sentry.captureException(err, {
        extra: { reactionVideoUrl, gaspUrl, step: 'ffmpeg' },
        tags: { feature: 'composite-service' },
      });
      throw err;
    }

    // Step 3: Upload to Firebase Storage
    let compositeUrl: string;
    try {
      const fileStream = fs.createReadStream(outputPath);
      const result = await uploadStreamToStorage({
        userId: reactorId,
        type: 'composites',
        stream: fileStream,
        extension: 'mp4',
        contentType: 'video/mp4',
      });
      compositeUrl = result.downloadUrl;
    } catch (err) {
      Sentry.captureException(err, {
        extra: { reactionVideoUrl, gaspUrl, step: 'upload' },
        tags: { feature: 'composite-service' },
      });
      throw err;
    }

    return { compositeUrl };
  } finally {
    // Always clean up temp directory — success or failure
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch((err) => {
      log.warn({ err, tmpDir }, 'Failed to clean up composite tmp directory');
    });
  }
}
