import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createId } from '@paralleldrive/cuid2';
import { firebaseStorage } from '../../config/firebase.js';

export type MediaType = 'gasps' | 'reactions' | 'avatars' | 'composites';

export const ALLOWED_MEDIA_TYPES: MediaType[] = ['gasps', 'reactions', 'avatars', 'composites'];

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
}

export async function uploadStreamToStorage({
  userId,
  type,
  stream,
  extension,
  contentType,
}: {
  userId: string;
  type: MediaType;
  stream: Readable;
  extension: string;
  contentType: string;
}): Promise<UploadResult> {
  const timestamp = Date.now();
  const random = createId().slice(0, 8);
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const storagePath = `${type}/${userId}/${timestamp}_${random}.${safeExtension}`;

  const bucket = firebaseStorage.bucket();
  const file = bucket.file(storagePath);

  const writeStream = file.createWriteStream({
    contentType,
    resumable: false,
    metadata: {
      contentType,
      metadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        mediaType: type,
      },
    },
  });

  try {
    await pipeline(stream, writeStream);
  } catch (err) {
    // Clean up partial upload so we don't leave orphans in Storage
    await file.delete().catch(() => {});
    throw err;
  }

  await file.makePublic();

  const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { downloadUrl, storagePath };
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  await firebaseStorage.bucket().file(storagePath).delete().catch(() => {});
}
