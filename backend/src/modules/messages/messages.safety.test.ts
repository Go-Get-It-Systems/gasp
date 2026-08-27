import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockFindFirst = vi.fn();
vi.mock('../../config/database.js', () => ({
  db: {
    query: {
      conversationParticipants: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
  },
}));

const mockViewGuard = vi.fn();
const mockInteractionGuard = vi.fn();
vi.mock('../conversations/conversations.service.js', () => ({
  assertConversationCanBeViewed: (...args: unknown[]) => mockViewGuard(...args),
  assertConversationCanBeUsedForInteraction: (...args: unknown[]) => mockInteractionGuard(...args),
}));

import { assertConversationAvailable } from './messages.service.js';

describe('assertConversationAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({ id: 'participant-1' });
  });

  test('delegates a normal conversation read to the block-aware view guard', async () => {
    await assertConversationAvailable('conversation-1', 'actor-1');
    expect(mockViewGuard).toHaveBeenCalledWith('conversation-1', 'actor-1');
    expect(mockInteractionGuard).not.toHaveBeenCalled();
  });

  test('delegates sends and typing events to the block-aware interaction guard', async () => {
    await assertConversationAvailable('conversation-1', 'actor-1', true);
    expect(mockInteractionGuard).toHaveBeenCalledWith('conversation-1', 'actor-1');
  });
});
