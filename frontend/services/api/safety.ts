import { api } from '@/services/api';
import {
  BlockedUserSchema,
  SubmitReportInputSchema,
  type BlockedUser,
  type SubmitReportInput,
} from '@/services/api/schemas/safety.schema';
import { validateResponse } from '@/services/api/schemas/common.schema';
import { z } from 'zod';

export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const res = await api.get<unknown>('/safety/blocks');
  return validateResponse(z.array(BlockedUserSchema), res.data, 'listBlockedUsers');
}

export async function blockUser(userId: string): Promise<void> {
  await api.post(`/safety/blocks/${userId}`);
}

export async function unblockUser(userId: string): Promise<void> {
  await api.delete(`/safety/blocks/${userId}`);
}

export async function submitReport(input: SubmitReportInput): Promise<void> {
  await api.post('/safety/reports', SubmitReportInputSchema.parse(input));
}
