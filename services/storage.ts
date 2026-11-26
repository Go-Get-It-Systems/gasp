import { Platform } from 'react-native';
import { api } from '@/services/api';
import { assertCurrentSession, getSessionActor, getSessionGeneration } from './session';

export type MediaType = 'gasps' | 'reactions' | 'avatars';

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
}

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

function getExtension(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?.*)?$/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

function getMimeType(extension: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
  };
  return map[extension] ?? 'application/octet-stream';
}

export async function uploadMedia(
  uri: string,
  type: MediaType,
  // _userId kept for API backwards-compat with uploadQueue; backend
  // resolves the actual userId from the JWT in the request.
  _userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  const generation = getSessionGeneration();
  if (getSessionActor() && getSessionActor() !== _userId) throw new Error('Upload account changed');
  const extension = getExtension(uri);
  const mimeType = getMimeType(extension);

  const formData = new FormData();
  formData.append('type', type);
  if (Platform.OS === 'web') {
    const resource = await fetch(uri);
    if (!resource.ok) throw new Error('Could not read the selected media.');
    const blob = await resource.blob();
    const browserMime = blob.type || mimeType;
    const browserExtension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic',
      'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
    } as Record<string, string>)[browserMime] ?? extension;
    formData.append('file', blob.type ? blob : new Blob([blob], { type: browserMime }), `upload.${browserExtension}`);
  } else {
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: `upload.${extension}`,
      type: mimeType,
    } as unknown as Blob);
  }

  assertCurrentSession(generation);
  const response = await api.post<UploadResult>('/uploads', formData, {
    timeout: UPLOAD_TIMEOUT_MS,
    headers: {
      // Browsers generate their multipart boundary; the native bridge needs
      // the explicit content type. Clear the API's JSON default on web.
      'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      const total = event.total;
      if (total && onProgress) {
        onProgress({
          progress: event.loaded / total,
          bytesTransferred: event.loaded,
          totalBytes: total,
        });
      }
    },
  });

  assertCurrentSession(generation);
  return response.data;
}

export async function uploadGasp(
  uri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  return uploadMedia(uri, 'gasps', userId, onProgress);
}

export async function uploadReaction(
  uri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  return uploadMedia(uri, 'reactions', userId, onProgress);
}
