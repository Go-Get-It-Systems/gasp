import type { FastifyInstance } from 'fastify';
import type { MultipartValue } from '@fastify/multipart';
import { authMiddleware } from '../auth/auth.middleware.js';
import { BadRequestError } from '../../shared/errors.js';
import { messageRateLimit } from '../../shared/rate-limit.js';
import {
  uploadStreamToStorage,
  deleteUploadedFile,
  ALLOWED_MEDIA_TYPES,
  type MediaType,
} from './uploads.service.js';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMETYPE_REGEX = /^(image|video)\//;

export async function uploadsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', messageRateLimit, async (request, reply) => {
    const data = await request.file({
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    });

    if (!data) {
      throw new BadRequestError('No file uploaded');
    }

    const typeField = data.fields.type as MultipartValue<string> | undefined;
    const type = typeField?.value;

    if (!type || !ALLOWED_MEDIA_TYPES.includes(type as MediaType)) {
      throw new BadRequestError(
        `Invalid or missing 'type' field. Must be one of: ${ALLOWED_MEDIA_TYPES.join(', ')}`,
      );
    }

    const contentType = data.mimetype || 'application/octet-stream';
    if (!ALLOWED_MIMETYPE_REGEX.test(contentType)) {
      throw new BadRequestError(
        `Invalid mimetype '${contentType}'. Only image/* and video/* are allowed.`,
      );
    }

    const filename = data.filename ?? 'upload';
    const extension = filename.includes('.')
      ? filename.split('.').pop() ?? 'bin'
      : 'bin';

    const userId = request.user.userId;

    const result = await uploadStreamToStorage({
      userId,
      type: type as MediaType,
      stream: data.file,
      extension,
      contentType,
    });

    if (data.file.truncated) {
      // File hit the size limit mid-stream — partial bytes were already
      // uploaded to Storage. Clean up so we don't leave a corrupt object.
      await deleteUploadedFile(result.storagePath);
      throw new BadRequestError(
        `File exceeds the maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
      );
    }

    return reply.send(result);
  });
}
