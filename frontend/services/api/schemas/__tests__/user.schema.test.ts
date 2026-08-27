import { UpdateProfileInputSchema, UserSchema } from '../user.schema';

describe('User profile schemas', () => {
  it('accepts a user response with an optional bio', () => {
    expect(UserSchema.parse({
      id: 'user-1', displayName: 'Alex', username: 'alex', avatarUrl: null,
      createdAt: '2026-08-07T00:00:00.000Z',
    })).toMatchObject({ id: 'user-1', username: 'alex' });
  });

  it('validates profile updates before sending them to the API', () => {
    expect(UpdateProfileInputSchema.parse({
      displayName: 'Alex', username: 'alex_m', avatarUrl: null, bio: 'Hello',
    })).toMatchObject({ username: 'alex_m', avatarUrl: null });

    expect(() => UpdateProfileInputSchema.parse({ username: 'not allowed!' })).toThrow();
  });
});
