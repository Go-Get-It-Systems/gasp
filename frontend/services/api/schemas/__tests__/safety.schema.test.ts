import { SubmitReportInputSchema } from '../safety.schema';

describe('Safety schemas', () => {
  it('accepts a report with a valid target and category', () => {
    expect(SubmitReportInputSchema.parse({
      targetType: 'message',
      targetId: 'message-1',
      category: 'harassment',
      description: 'Unwanted contact',
    })).toMatchObject({ targetType: 'message', category: 'harassment' });
  });

  it('rejects unsupported targets and categories before the request is sent', () => {
    expect(() => SubmitReportInputSchema.parse({
      targetType: 'conversation', targetId: 'conversation-1', category: 'invalid',
    })).toThrow();
  });
});
