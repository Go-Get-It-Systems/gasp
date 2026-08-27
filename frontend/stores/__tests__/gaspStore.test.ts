import type { Gasp } from '@/services/api/schemas/gasp.schema';
import { useGaspStore } from '@/stores/gaspStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

const initialState = useGaspStore.getState();

function makeGasp(overrides: Partial<Gasp> = {}): Gasp {
  return {
    id: 'gasp-1',
    senderId: 'user-1',
    senderName: 'Alice',
    senderAvatarUrl: null,
    imageUrl: 'https://example.com/gasp.jpg',
    imageUri: 'https://example.com/gasp.jpg',
    mediaType: 'image',
    blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    replayable: false,
    status: 'pending',
    deliveryStatus: 'sent',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

// ── Setup/Teardown ────────────────────────────────────────────────────────────

beforeEach(() => {
  useGaspStore.setState({
    ...initialState,
    reactions: [],
    currentViewingGasp: null,
    isHolding: false,
    holdProgress: 0,
    viewedChatGaspIds: {},
    viewedGaspUrls: {},
  });
  jest.clearAllMocks();
});

// ── markGaspViewed ────────────────────────────────────────────────────────────

describe('markGaspViewed', () => {
  it('records the imageUri in viewedGaspUrls when provided', () => {
    useGaspStore.getState().markGaspViewed('gasp-1', 'https://example.com/a.jpg');

    const { viewedGaspUrls } = useGaspStore.getState();
    expect(viewedGaspUrls['https://example.com/a.jpg']).toBe(true);
  });

  it('does not modify viewedGaspUrls when imageUri is omitted', () => {
    useGaspStore.setState({ viewedGaspUrls: {} });

    useGaspStore.getState().markGaspViewed('gasp-1');

    const { viewedGaspUrls } = useGaspStore.getState();
    expect(Object.keys(viewedGaspUrls)).toHaveLength(0);
  });

  it('accumulates multiple imageUris without overwriting existing ones', () => {
    useGaspStore.getState().markGaspViewed('gasp-1', 'https://example.com/a.jpg');
    useGaspStore.getState().markGaspViewed('gasp-2', 'https://example.com/b.jpg');

    const { viewedGaspUrls } = useGaspStore.getState();
    expect(viewedGaspUrls['https://example.com/a.jpg']).toBe(true);
    expect(viewedGaspUrls['https://example.com/b.jpg']).toBe(true);
  });
});

// ── markChatGaspViewed ────────────────────────────────────────────────────────

describe('markChatGaspViewed', () => {
  it('records the messageId in viewedChatGaspIds', () => {
    useGaspStore.getState().markChatGaspViewed('msg-123');

    const { viewedChatGaspIds } = useGaspStore.getState();
    expect(viewedChatGaspIds['msg-123']).toBe(true);
  });

  it('records the mediaUrl in viewedGaspUrls when provided', () => {
    const mediaUrl = 'https://example.com/chat-gasp.mp4';
    useGaspStore.getState().markChatGaspViewed('msg-123', mediaUrl);

    const { viewedGaspUrls } = useGaspStore.getState();
    expect(viewedGaspUrls[mediaUrl]).toBe(true);
  });

  it('does not modify viewedGaspUrls when mediaUrl is omitted', () => {
    useGaspStore.setState({ viewedGaspUrls: {} });
    useGaspStore.getState().markChatGaspViewed('msg-123');

    const { viewedGaspUrls } = useGaspStore.getState();
    expect(Object.keys(viewedGaspUrls)).toHaveLength(0);
  });

  it('accumulates multiple messageIds without overwriting existing ones', () => {
    useGaspStore.getState().markChatGaspViewed('msg-1', 'https://example.com/1.jpg');
    useGaspStore.getState().markChatGaspViewed('msg-2', 'https://example.com/2.jpg');

    const { viewedChatGaspIds, viewedGaspUrls } = useGaspStore.getState();
    expect(viewedChatGaspIds['msg-1']).toBe(true);
    expect(viewedChatGaspIds['msg-2']).toBe(true);
    expect(viewedGaspUrls['https://example.com/1.jpg']).toBe(true);
    expect(viewedGaspUrls['https://example.com/2.jpg']).toBe(true);
  });
});

// ── isGaspMediaViewed ─────────────────────────────────────────────────────────

describe('isGaspMediaViewed', () => {
  it('returns false for an unviewed mediaUrl', () => {
    const result = useGaspStore.getState().isGaspMediaViewed('https://example.com/unseen.jpg');
    expect(result).toBe(false);
  });

  it('returns true after markGaspViewed records the imageUri', () => {
    const imageUri = 'https://example.com/shared-media.jpg';
    useGaspStore.getState().markGaspViewed('gasp-inbox', imageUri);
    expect(useGaspStore.getState().isGaspMediaViewed(imageUri)).toBe(true);
  });

  it('returns true after markChatGaspViewed records a mediaUrl', () => {
    const mediaUrl = 'https://example.com/chat-media.jpg';
    useGaspStore.getState().markChatGaspViewed('msg-abc', mediaUrl);
    expect(useGaspStore.getState().isGaspMediaViewed(mediaUrl)).toBe(true);
  });

  it('inbox viewed URL blocks the same URL in chat context', () => {
    const sharedUrl = 'https://cdn.example.com/media.jpg';

    // Simulate socket listener calling markGaspViewed with the imageUri
    useGaspStore.getState().markGaspViewed('inbox-gasp', sharedUrl);

    // Chat should see this URL as already viewed
    expect(useGaspStore.getState().isGaspMediaViewed(sharedUrl)).toBe(true);
  });
});

// ── isChatGaspViewed ──────────────────────────────────────────────────────────

describe('isChatGaspViewed', () => {
  it('returns false for an unseen message', () => {
    expect(useGaspStore.getState().isChatGaspViewed('msg-unknown')).toBe(false);
  });

  it('returns true after markChatGaspViewed', () => {
    useGaspStore.getState().markChatGaspViewed('msg-seen');
    expect(useGaspStore.getState().isChatGaspViewed('msg-seen')).toBe(true);
  });
});

// ── clearViewedChatGasps ──────────────────────────────────────────────────────

describe('clearViewedChatGasps', () => {
  it('resets both viewedChatGaspIds and viewedGaspUrls', () => {
    useGaspStore.setState({
      viewedChatGaspIds: { 'msg-1': true },
      viewedGaspUrls: { 'https://example.com/img.jpg': true },
    });

    useGaspStore.getState().clearViewedChatGasps();

    expect(useGaspStore.getState().viewedChatGaspIds).toEqual({});
    expect(useGaspStore.getState().viewedGaspUrls).toEqual({});
  });
});

// ── hold state ────────────────────────────────────────────────────────────────

describe('hold state', () => {
  it('setHolding updates isHolding', () => {
    useGaspStore.getState().setHolding(true);
    expect(useGaspStore.getState().isHolding).toBe(true);
    useGaspStore.getState().setHolding(false);
    expect(useGaspStore.getState().isHolding).toBe(false);
  });

  it('setHoldProgress updates holdProgress', () => {
    useGaspStore.getState().setHoldProgress(0.75);
    expect(useGaspStore.getState().holdProgress).toBe(0.75);
  });
});

// ── addReaction ───────────────────────────────────────────────────────────────

describe('addReaction', () => {
  it('prepends a reaction to the reactions array', () => {
    const reaction = {
      id: 'r-1',
      gaspId: 'gasp-1',
      reactorId: 'user-2',
      reactorName: 'Bob',
      reactionVideoUri: 'https://example.com/reaction.mp4',
      originalImageUri: 'https://example.com/gasp.jpg',
      capturedAt: '2026-01-01T00:00:00.000Z',
    };

    useGaspStore.getState().addReaction(reaction);
    expect(useGaspStore.getState().reactions[0]).toEqual(reaction);
  });
});

// ── setCurrentGasp ────────────────────────────────────────────────────────────

describe('setCurrentGasp', () => {
  it('sets currentViewingGasp', () => {
    const gasp = makeGasp();
    useGaspStore.getState().setCurrentGasp(gasp);
    expect(useGaspStore.getState().currentViewingGasp).toEqual(gasp);
  });

  it('clears currentViewingGasp when passed null', () => {
    useGaspStore.setState({ currentViewingGasp: makeGasp() });
    useGaspStore.getState().setCurrentGasp(null);
    expect(useGaspStore.getState().currentViewingGasp).toBeNull();
  });
});
