import { deriveInboxPulseState } from '@/services/notificationHelpers';
import { ToastItem, useNotificationStore } from '@/stores/notificationStore';
import fc from 'fast-check';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToastItem(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: 'toast-1',
    kind: 'gasp.received',
    title: 'New Gasp',
    body: 'Alice',
    route: '/(modals)/view-gasp?gaspId=gasp-1',
    gaspId: 'gasp-1',
    imageUri: 'https://example.com/img.jpg',
    blurhash: 'LKO2?U%2Tw=w',
    ...overrides,
  };
}

// fast-check arbitrary for ToastItem
const toastItemArb = fc.record({
  id: fc.uuid(),
  kind: fc.constant('gasp.received' as const),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  body: fc.string({ minLength: 1, maxLength: 100 }),
  route: fc.webPath(),
  gaspId: fc.uuid(),
  imageUri: fc.webUrl(),
  blurhash: fc.string({ minLength: 4, maxLength: 30 }),
});

// ── Setup/Teardown ────────────────────────────────────────────────────────────

beforeEach(() => {
  useNotificationStore.setState({
    toastQueue: [],
    activeToast: null,
    recentToastIds: [],
    tabPulseTrigger: 0,
    inboxUnreadType: null,
    chatHasUnread: false,
    chatUnreadHintAt: null,
  });
  jest.clearAllMocks();
  jest.useRealTimers();
});

// ── Unit Tests: enqueueToast ──────────────────────────────────────────────────

describe('enqueueToast', () => {
  it('sets activeToast when queue is empty and no active toast', () => {
    const item = makeToastItem();
    useNotificationStore.getState().enqueueToast(item);

    expect(useNotificationStore.getState().activeToast).toEqual(item);
    expect(useNotificationStore.getState().toastQueue).toHaveLength(0);
  });

  it('appends to toastQueue when activeToast is occupied', () => {
    const first = makeToastItem({ id: 'first', gaspId: 'gasp-first' });
    const second = makeToastItem({ id: 'second', gaspId: 'gasp-second' });

    useNotificationStore.getState().enqueueToast(first);
    useNotificationStore.getState().enqueueToast(second);

    expect(useNotificationStore.getState().activeToast).toEqual(first);
    expect(useNotificationStore.getState().toastQueue).toHaveLength(1);
    expect(useNotificationStore.getState().toastQueue[0]).toEqual(second);
  });

  it('dedupes when the same toast id is already active', () => {
    const item = makeToastItem({ id: 'same-id' });

    useNotificationStore.getState().enqueueToast(item);
    useNotificationStore.getState().enqueueToast({ ...item, body: 'Duplicate' });

    expect(useNotificationStore.getState().activeToast).toEqual(item);
    expect(useNotificationStore.getState().toastQueue).toHaveLength(0);
  });

  it('dedupes when the same toast id is already queued', () => {
    const first = makeToastItem({ id: 'first' });
    const second = makeToastItem({ id: 'second' });

    useNotificationStore.getState().enqueueToast(first);
    useNotificationStore.getState().enqueueToast(second);
    useNotificationStore.getState().enqueueToast({ ...second, body: 'Duplicate' });

    expect(useNotificationStore.getState().toastQueue).toEqual([second]);
  });

  it('dedupes a repeated event after the original toast has been dismissed', () => {
    jest.useFakeTimers();
    const item = makeToastItem({ id: 'same-event' });

    useNotificationStore.getState().enqueueToast(item);
    useNotificationStore.getState().dequeueToast();
    useNotificationStore.getState().enqueueToast(item);

    expect(useNotificationStore.getState().activeToast).toBeNull();
    expect(useNotificationStore.getState().toastQueue).toEqual([]);
    jest.useRealTimers();
  });
});

// ── Unit Tests: dequeueToast ──────────────────────────────────────────────────

describe('dequeueToast', () => {
  it('clears activeToast immediately', () => {
    jest.useFakeTimers();
    const item = makeToastItem();
    useNotificationStore.setState({ activeToast: item });

    useNotificationStore.getState().dequeueToast();

    expect(useNotificationStore.getState().activeToast).toBeNull();
    jest.useRealTimers();
  });

  it('promotes next item from queue after 500ms delay', () => {
    jest.useFakeTimers();
    const first = makeToastItem({ id: 'first', gaspId: 'gasp-first' });
    const second = makeToastItem({ id: 'second', gaspId: 'gasp-second' });

    useNotificationStore.setState({ activeToast: first, toastQueue: [second] });
    useNotificationStore.getState().dequeueToast();

    // Immediately after dequeue, activeToast is null
    expect(useNotificationStore.getState().activeToast).toBeNull();

    // After 500ms, next item is promoted
    jest.advanceTimersByTime(500);
    expect(useNotificationStore.getState().activeToast).toEqual(second);
    expect(useNotificationStore.getState().toastQueue).toHaveLength(0);

    jest.useRealTimers();
  });
});

// ── Unit Tests: triggerTabPulse ───────────────────────────────────────────────

describe('triggerTabPulse', () => {
  it('increments tabPulseTrigger by 1', () => {
    expect(useNotificationStore.getState().tabPulseTrigger).toBe(0);

    useNotificationStore.getState().triggerTabPulse();
    expect(useNotificationStore.getState().tabPulseTrigger).toBe(1);

    useNotificationStore.getState().triggerTabPulse();
    expect(useNotificationStore.getState().tabPulseTrigger).toBe(2);
  });
});

// ── Unit Tests: resetTabPulse ─────────────────────────────────────────────────

describe('resetTabPulse', () => {
  it('zeros the tabPulseTrigger', () => {
    useNotificationStore.setState({ tabPulseTrigger: 5 });

    useNotificationStore.getState().resetTabPulse();
    expect(useNotificationStore.getState().tabPulseTrigger).toBe(0);
  });
});

// ── Unit Tests: setInboxUnreadType ────────────────────────────────────────────

describe('setInboxUnreadType', () => {
  it('transitions between gasp, reaction, and null', () => {
    useNotificationStore.getState().setInboxUnreadType('gasp');
    expect(useNotificationStore.getState().inboxUnreadType).toBe('gasp');

    useNotificationStore.getState().setInboxUnreadType('reaction');
    expect(useNotificationStore.getState().inboxUnreadType).toBe('reaction');

    useNotificationStore.getState().setInboxUnreadType(null);
    expect(useNotificationStore.getState().inboxUnreadType).toBeNull();
  });
});

// ── Unit Tests: setChatHasUnread ──────────────────────────────────────────────

describe('setChatHasUnread', () => {
  it('toggles the boolean and timestamps the temporary hint', () => {
    useNotificationStore.getState().setChatHasUnread(true);
    expect(useNotificationStore.getState().chatHasUnread).toBe(true);
    expect(useNotificationStore.getState().chatUnreadHintAt).toEqual(expect.any(Number));

    useNotificationStore.getState().setChatHasUnread(false);
    expect(useNotificationStore.getState().chatHasUnread).toBe(false);
    expect(useNotificationStore.getState().chatUnreadHintAt).toBeNull();
  });
});

// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('Property-Based Tests', () => {
  // Feature: gasp-notifications, Property 1: Toast queue enqueue adds item
  it('Property 1: enqueue adds item to toastQueue when activeToast is occupied', () => {
    fc.assert(
      fc.property(toastItemArb, toastItemArb, (occupant, newItem) => {
        // Reset store
        useNotificationStore.setState({
          toastQueue: [],
          activeToast: occupant,
          tabPulseTrigger: 0,
          inboxUnreadType: null,
          chatHasUnread: false,
          chatUnreadHintAt: null,
        });

        useNotificationStore.getState().enqueueToast(newItem);

        const { toastQueue } = useNotificationStore.getState();
        const enqueued = toastQueue.find(
          (item) =>
            item.gaspId === newItem.gaspId &&
            item.body === newItem.body &&
            item.imageUri === newItem.imageUri
        );
        expect(enqueued).toBeDefined();
      })
    );
  });

  // Feature: gasp-notifications, Property 2: Toast queue preserves FIFO order
  it('Property 2: toast queue preserves FIFO order and dequeue reduces length by one', () => {
    jest.useFakeTimers();

    fc.assert(
      fc.property(
        toastItemArb,
        fc.array(toastItemArb, { minLength: 1, maxLength: 20 }),
        (occupant, items) => {
          // Reset store with an active toast so items go to queue
          useNotificationStore.setState({
            toastQueue: [],
            activeToast: occupant,
            tabPulseTrigger: 0,
            inboxUnreadType: null,
            chatHasUnread: false,
          });

          // Enqueue all items
          for (const item of items) {
            useNotificationStore.getState().enqueueToast(item);
          }

          const { toastQueue } = useNotificationStore.getState();

          // Verify FIFO order: items appear in the same order they were enqueued
          expect(toastQueue).toHaveLength(items.length);
          for (let i = 0; i < items.length; i++) {
            expect(toastQueue[i].gaspId).toBe(items[i].gaspId);
            expect(toastQueue[i].body).toBe(items[i].body);
            expect(toastQueue[i].imageUri).toBe(items[i].imageUri);
          }

          // Dequeue and verify length reduces by exactly one
          const lengthBefore = useNotificationStore.getState().toastQueue.length;
          useNotificationStore.getState().dequeueToast();
          jest.advanceTimersByTime(500);

          const lengthAfter = useNotificationStore.getState().toastQueue.length;
          expect(lengthAfter).toBe(lengthBefore - 1);
        }
      )
    );

    jest.useRealTimers();
  });

  // Feature: gasp-notifications, Property 4: Pulse state reflects pending gasps
  it('Property 4: deriveInboxPulseState returns true iff array is non-empty', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.uuid(), name: fc.string() }), { minLength: 0, maxLength: 50 }),
        (pendingGasps) => {
          const result = deriveInboxPulseState(pendingGasps);
          if (pendingGasps.length > 0) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      )
    );
  });
});
