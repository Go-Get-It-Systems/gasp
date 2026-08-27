/**
 * Business Studio configuration helpers.
 *
 * All values are derived from `env` (validated at startup). This module
 * provides a typed config object and utility functions so the rest of the
 * codebase never has to read raw env vars directly for Business Studio logic.
 */

import { env } from './env.js';

/** Typed Business Studio config derived from validated env. */
export interface BusinessStudioConfig {
  /** Master on/off switch. When false, publishing is denied (R6.3). */
  enabled: boolean;
  /**
   * Workspace IDs allowed into Studio even when `enabled` is false.
   * Studio *entry* for these owners is discretionary and not mandated off by
   * the flag alone (R6.3 / design §6).
   */
  allowedWorkspaceIds: string[];
  /**
   * Maximum number of opted-in followers who receive a campaign.
   * 0 is a valid setting that prevents delivery without disabling the feature (R6.2).
   */
  followerCap: number;
  /** Maximum number of campaigns a workspace may publish per calendar day. */
  campaignsPerDay: number;
  /** Number of delivery records processed per BullMQ job chunk. */
  fanOutChunkSize: number;
}

export function getBusinessStudioConfig(): BusinessStudioConfig {
  return {
    enabled: env.BUSINESS_STUDIO_ENABLED,
    allowedWorkspaceIds: env.BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS,
    followerCap: env.BUSINESS_STUDIO_FOLLOWER_CAP,
    campaignsPerDay: env.BUSINESS_STUDIO_CAMPAIGNS_PER_DAY,
    fanOutChunkSize: env.BUSINESS_STUDIO_FANOUT_CHUNK_SIZE,
  };
}

// ─── Publish guard ───────────────────────────────────────────────────────────

/**
 * Error thrown by `assertPublishingEnabled` when the feature flag is off.
 * Callers (route handlers, services) can catch this and return 403.
 */
export class BusinessStudioDisabledError extends Error {
  readonly statusCode = 403 as const;
  readonly code = 'BUSINESS_STUDIO_DISABLED' as const;

  constructor() {
    super('Business Studio is not enabled');
    this.name = 'BusinessStudioDisabledError';
  }
}

/**
 * Asserts that publishing operations are permitted.
 *
 * Throws `BusinessStudioDisabledError` when `BUSINESS_STUDIO_ENABLED=false`.
 *
 * **Important:** this guard is only for *publishing* operations. Studio *entry*
 * for allow-listed workspace owners is a separate, discretionary check and must
 * not be blocked by calling this function (R6.3).
 *
 * @throws {BusinessStudioDisabledError} when the feature flag is off.
 */
export function assertPublishingEnabled(
  config: BusinessStudioConfig = getBusinessStudioConfig(),
): void {
  if (!config.enabled) {
    throw new BusinessStudioDisabledError();
  }
}

/**
 * Returns true when the workspace may access Studio (discretionary entry check).
 *
 * When the flag is enabled, every owner can enter Studio.
 * When the flag is disabled, only workspace IDs in the allow-list may enter.
 * This is distinct from publishing: even allow-listed owners cannot *publish*
 * while the flag is off.
 *
 * @param workspaceId  The workspace ID to check.
 * @param config       Optional config override (defaults to env-derived config).
 */
export function isStudioAccessPermitted(
  workspaceId: string,
  config: BusinessStudioConfig = getBusinessStudioConfig(),
): boolean {
  if (config.enabled) return true;
  return config.allowedWorkspaceIds.includes(workspaceId);
}
