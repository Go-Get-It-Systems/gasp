import { api } from '@/services/api';
import type { Gasp, ApiPendingGasp, ApiGasp } from '@/services/api/schemas/gasp.schema';
import { normalizePendingGasp, normalizeGasp } from '@/services/api/schemas/gasp.schema';

interface SendGaspInput {
  recipientId: string;
  imageUrl: string;
  mediaType?: 'image' | 'video';
  blurhash?: string;
  textOverlay?: string;
  replayable?: boolean;
}

interface BatchGaspInput {
  recipientIds: string[];
  imageUrl: string;
  mediaType?: 'image' | 'video';
  blurhash?: string;
  textOverlay?: string;
  replayable?: boolean;
}

export async function sendGasp(data: SendGaspInput): Promise<Gasp> {
  const res = await api.post<ApiGasp>('/gasps', data);
  return normalizeGasp(res.data);
}

export async function sendBatchGasp(data: BatchGaspInput): Promise<Gasp[]> {
  const res = await api.post<ApiGasp[]>('/gasps/batch', data);
  return res.data.map(normalizeGasp);
}

export async function getPendingGasps(): Promise<Gasp[]> {
  const res = await api.get<ApiPendingGasp[]>('/gasps/pending');
  return res.data.map(normalizePendingGasp);
}

export async function getSentGasps(): Promise<Gasp[]> {
  const res = await api.get<ApiGasp[]>('/gasps/sent');
  return res.data.map(normalizeGasp);
}

/**
 * Abre o gasp — inicia a janela de reação no backend.
 * Substitui o antigo markViewed.
 */
export async function openGasp(gaspId: string): Promise<Gasp> {
  const res = await api.patch<ApiGasp>(`/gasps/${gaspId}/open`);
  return normalizeGasp(res.data);
}

/**
 * Fecha a janela de reação sem reação enviada. Marca como viewed.
 */
export async function closeViewGasp(gaspId: string): Promise<Gasp> {
  const res = await api.patch<ApiGasp>(`/gasps/${gaspId}/close-view`);
  return normalizeGasp(res.data);
}

/**
 * @deprecated Use openGasp + closeViewGasp.
 */
export async function markViewed(gaspId: string): Promise<void> {
  await api.patch(`/gasps/${gaspId}/view`);
}
