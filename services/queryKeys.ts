export const queryKeys = {
  conversations: {
    all: ['conversations'] as const,
    detail: (id: string) => ['conversations', id] as const,
  },
  messages: {
    byConversation: (id: string) => ['messages', id] as const,
  },
  gasps: {
    pending: ['gasps', 'pending'] as const,
    sent: ['gasps', 'sent'] as const,
  },
  friends: {
    all: ['friends'] as const,
    requests: ['friends', 'requests'] as const,
  },
  profile: {
    stats: ['profile', 'stats'] as const,
  },
  discover: {
    recommended: ['discover', 'recommended'] as const,
    topGaspers: ['discover', 'topGaspers'] as const,
  },
  users: {
    me: ['users', 'me'] as const,
    search: (query: string) => ['users', 'search', query] as const,
    profile: (id: string) => ['users', 'profile', id] as const,
    stats: (id: string) => ['users', 'stats', id] as const,
  },
  notifications: {
    deviceToken: ['notifications', 'deviceToken'] as const,
  },
} as const;
