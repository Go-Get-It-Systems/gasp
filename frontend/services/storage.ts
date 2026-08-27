import { Platform } from 'react-native';
import { api } from '@/services/api';

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
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
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
  const extension = getExtension(uri);
  const mimeType = getMimeType(extension);

  const formData = new FormData();
  formData.append('type', type);
  formData.append('file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: `upload.${extension}`,
    type: mimeType,
  } as unknown as Blob);

  const response = await api.post<UploadResult>('/uploads', formData, {
    timeout: UPLOAD_TIMEOUT_MS,
    headers: {
      // React Native's axios cannot introspect FormData like the browser does,
      // so it won't set Content-Type automatically. We set it explicitly here;
      // the native bridge fills in the proper `boundary` parameter.
      'Content-Type': 'multipart/form-data',
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
