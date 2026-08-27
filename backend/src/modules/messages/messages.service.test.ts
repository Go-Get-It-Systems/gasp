import { describe, expect, test, vi } from 'vitest';

vi.mock('../../config/database.js', () => ({
  db: {},
}));

import { selectMessageNotificationRecipients } from './messages.service.js';

describe('selectMessageNotificationRecipients', () => {
  test('excludes sender from message notification recipients', () => {
    const recipients = selectMessageNotificationRecipients([
      { userId: 'sender-1', displayName: 'Sender' },
      { userId: 'recipient-1', displayName: 'Recipient' },
      { userId: 'recipient-2', displayName: 'Other Recipient' },
    ], 'sender-1');

    expect(recipients).toEqual([
      { userId: 'recipient-1', displayName: 'Recipient' },
      { userId: 'recipient-2', displayName: 'Other Recipient' },
    ]);
  });

  test('preserves separate recipients in original order', () => {
    const recipients = selectMessageNotificationRecipients([
      { userId: 'recipient-1' },
      { userId: 'recipient-2' },
    ], 'sender-1');

    expect(recipients).toEqual([
      { userId: 'recipient-1' },
      { userId: 'recipient-2' },
    ]);
  });
});
