export const queryKeys = {
  business: {
    all: ['business'] as const,
    actor: (actor: string) => ['business', actor] as const,
    workspaces: (actor: string) => ['business', actor, 'workspaces'] as const,
    directory: (actor: string) => ['business', actor, 'directory'] as const,
    inbox: (actor: string) => ['business', actor, 'inbox'] as const,
    myReactions: (actor: string) => ['business', actor, 'myReactions'] as const,
    profile: (actor: string, handle: string) => ['business', actor, 'profile', handle] as const,
    workspace: (actor: string, workspace: string, resource: string) => ['business', actor, workspace, resource] as const,
    campaign: (actor: string, workspace: string, campaign: string, resource: string) => ['business', actor, workspace, campaign, resource] as const,
  },
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
    latestMoment: ['gasps', 'latestMoment'] as const,
  },
  reactions: {
    received: ['reactions', 'received'] as const,
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
  safety: {
    blocks: ['safety', 'blocks'] as const,
  },
} as const;
