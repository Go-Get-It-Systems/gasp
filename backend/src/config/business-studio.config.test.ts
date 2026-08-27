/**
 * Tests for Business Studio config validation and publish guard.
 *
 * The env schema is tested in isolation (not via the real env module) so we
 * can exercise invalid inputs without hitting process.exit(1).
 */

import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import {
  assertPublishingEnabled,
  BusinessStudioDisabledError,
  isStudioAccessPermitted,
  type BusinessStudioConfig,
} from './business-studio.config.js';

// ─── Inline the Business Studio slice of the env schema for isolated testing ─

const businessStudioEnvSchema = z.object({
  BUSINESS_STUDIO_ENABLED: z
    .string()
    .toLowerCase()
    .pipe(z.enum(['true', 'false']))
    .transform((v) => v === 'true')
    .default('false'),
  BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  BUSINESS_STUDIO_FOLLOWER_CAP: z.coerce.number().int().min(0).default(20),
  BUSINESS_STUDIO_CAMPAIGNS_PER_DAY: z.coerce.number().int().min(1).default(1),
  BUSINESS_STUDIO_FANOUT_CHUNK_SIZE: z.coerce.number().int().min(1).default(20),
});

function parseConfig(input: Record<string, string>) {
  return businessStudioEnvSchema.safeParse(input);
}

// ─── Schema validation ────────────────────────────────────────────────────────

describe('Business Studio env schema', () => {
  test('empty input produces safe-off defaults', () => {
    const result = parseConfig({});
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      BUSINESS_STUDIO_ENABLED: false,
      BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS: [],
      BUSINESS_STUDIO_FOLLOWER_CAP: 20,
      BUSINESS_STUDIO_CAMPAIGNS_PER_DAY: 1,
      BUSINESS_STUDIO_FANOUT_CHUNK_SIZE: 20,
    });
  });

  test('BUSINESS_STUDIO_ENABLED=false keeps feature off', () => {
    const result = parseConfig({ BUSINESS_STUDIO_ENABLED: 'false' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.BUSINESS_STUDIO_ENABLED).toBe(false);
  });

  test('BUSINESS_STUDIO_ENABLED=true turns feature on', () => {
    const result = parseConfig({ BUSINESS_STUDIO_ENABLED: 'true' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.BUSINESS_STUDIO_ENABLED).toBe(true);
  });

  test('BUSINESS_STUDIO_ENABLED is case-insensitive (TRUE / False)', () => {
    const upper = parseConfig({ BUSINESS_STUDIO_ENABLED: 'TRUE' });
    const mixed = parseConfig({ BUSINESS_STUDIO_ENABLED: 'False' });
    expect(upper.success).toBe(true);
    expect(mixed.success).toBe(true);
    if (upper.success) expect(upper.data.BUSINESS_STUDIO_ENABLED).toBe(true);
    if (mixed.success) expect(mixed.data.BUSINESS_STUDIO_ENABLED).toBe(false);
  });

  test('invalid BUSINESS_STUDIO_ENABLED value fails validation', () => {
    const result = parseConfig({ BUSINESS_STUDIO_ENABLED: 'yes' });
    expect(result.success).toBe(false);
  });

  // R6.2: follower cap of 0 must be accepted
  test('BUSINESS_STUDIO_FOLLOWER_CAP=0 is valid (prevents delivery, not disabled)', () => {
    const result = parseConfig({ BUSINESS_STUDIO_FOLLOWER_CAP: '0' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.BUSINESS_STUDIO_FOLLOWER_CAP).toBe(0);
  });

  test('negative BUSINESS_STUDIO_FOLLOWER_CAP fails validation', () => {
    const result = parseConfig({ BUSINESS_STUDIO_FOLLOWER_CAP: '-1' });
    expect(result.success).toBe(false);
  });

  test('non-numeric BUSINESS_STUDIO_FOLLOWER_CAP fails validation', () => {
    const result = parseConfig({ BUSINESS_STUDIO_FOLLOWER_CAP: 'many' });
    expect(result.success).toBe(false);
  });

  test('BUSINESS_STUDIO_CAMPAIGNS_PER_DAY=0 fails validation (must be ≥ 1)', () => {
    const result = parseConfig({ BUSINESS_STUDIO_CAMPAIGNS_PER_DAY: '0' });
    expect(result.success).toBe(false);
  });

  test('BUSINESS_STUDIO_FANOUT_CHUNK_SIZE=0 fails validation (must be ≥ 1)', () => {
    const result = parseConfig({ BUSINESS_STUDIO_FANOUT_CHUNK_SIZE: '0' });
    expect(result.success).toBe(false);
  });

  test('comma-separated ALLOWED_WORKSPACE_IDS are parsed to an array', () => {
    const result = parseConfig({
      BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS: 'ws-1,ws-2, ws-3 ',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS).toEqual(['ws-1', 'ws-2', 'ws-3']);
  });

  test('empty ALLOWED_WORKSPACE_IDS produces an empty array', () => {
    const result = parseConfig({ BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS: '' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS).toEqual([]);
  });
});

// ─── assertPublishingEnabled ──────────────────────────────────────────────────

describe('assertPublishingEnabled', () => {
  const enabledConfig: BusinessStudioConfig = {
    enabled: true,
    allowedWorkspaceIds: [],
    followerCap: 20,
    campaignsPerDay: 1,
    fanOutChunkSize: 20,
  };

  const disabledConfig: BusinessStudioConfig = {
    ...enabledConfig,
    enabled: false,
  };

  test('does not throw when the feature flag is true', () => {
    expect(() => assertPublishingEnabled(enabledConfig)).not.toThrow();
  });

  test('throws BusinessStudioDisabledError when the feature flag is false', () => {
    expect(() => assertPublishingEnabled(disabledConfig)).toThrow(
      BusinessStudioDisabledError,
    );
  });

  test('thrown error has statusCode 403 and correct code', () => {
    try {
      assertPublishingEnabled(disabledConfig);
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessStudioDisabledError);
      expect((err as BusinessStudioDisabledError).statusCode).toBe(403);
      expect((err as BusinessStudioDisabledError).code).toBe('BUSINESS_STUDIO_DISABLED');
    }
  });

  test('thrown error message is human-readable', () => {
    try {
      assertPublishingEnabled(disabledConfig);
    } catch (err) {
      expect((err as Error).message).toBe('Business Studio is not enabled');
    }
  });
});

// ─── isStudioAccessPermitted ──────────────────────────────────────────────────

describe('isStudioAccessPermitted', () => {
  const base: BusinessStudioConfig = {
    enabled: false,
    allowedWorkspaceIds: ['ws-allowed'],
    followerCap: 20,
    campaignsPerDay: 1,
    fanOutChunkSize: 20,
  };

  test('returns true for any workspace when feature is enabled', () => {
    const config: BusinessStudioConfig = { ...base, enabled: true };
    expect(isStudioAccessPermitted('ws-unknown', config)).toBe(true);
    expect(isStudioAccessPermitted('ws-allowed', config)).toBe(true);
  });

  test('returns true for allow-listed workspace when feature is disabled', () => {
    expect(isStudioAccessPermitted('ws-allowed', base)).toBe(true);
  });

  test('returns false for non-allow-listed workspace when feature is disabled', () => {
    expect(isStudioAccessPermitted('ws-not-allowed', base)).toBe(false);
  });

  test('returns false for any workspace when feature is disabled and allow-list is empty', () => {
    const config: BusinessStudioConfig = { ...base, allowedWorkspaceIds: [] };
    expect(isStudioAccessPermitted('ws-allowed', config)).toBe(false);
  });
});
