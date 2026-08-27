import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockFindFirst, mockValues, mockInsert } = vi.hoisted(() => {
  const values = vi.fn();
  return {
    mockFindFirst: vi.fn(),
    mockValues: values,
    mockInsert: vi.fn(() => ({ values })),
  };
});
vi.mock('../../config/database.js', () => ({
  db: {
    query: { userBlocks: { findFirst: mockFindFirst } },
    insert: mockInsert,
  },
}));

import { assertUsersCanInteract } from './safety.service.js';

describe('assertUsersCanInteract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockResolvedValue(undefined);
  });

  test('rejects a direct interaction when either user has a block relation', async () => {
    mockFindFirst.mockResolvedValue({ id: 'block-1' });

    await expect(assertUsersCanInteract('actor-1', 'recipient-1'))
      .rejects.toMatchObject({ statusCode: 403, message: 'This interaction is unavailable' });

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  test('allows an interaction when no block relation exists', async () => {
    mockFindFirst.mockResolvedValue(undefined);

    await expect(assertUsersCanInteract('actor-1', 'recipient-1')).resolves.toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
