import { act, fireEvent, render } from "@testing-library/react-native";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("expo-blur", () => ({
  BlurView: "BlurView",
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import { ToastBanner } from "@/components/notifications/ToastBanner";
import { ToastItem, useNotificationStore } from "@/stores/notificationStore";
import { router } from "expo-router";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToast(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: "toast-1",
    kind: "gasp.received",
    title: "New Gasp",
    body: "Alice",
    route: "/(modals)/view-gasp?gaspId=gasp-abc",
    gaspId: "gasp-abc",
    imageUri: "https://example.com/img.jpg",
    blurhash: "LKO2?U%2Tw=w",
    ...overrides,
  };
}

function resetStore() {
  useNotificationStore.setState({
    toastQueue: [],
    activeToast: null,
    recentToastIds: [],
    tabPulseTrigger: 0,
    inboxUnreadType: null,
    chatHasUnread: false,
  });
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ToastBanner", () => {
  it("calls dequeueToast after 4 seconds auto-dismiss", () => {
    const toast = makeToast();
    useNotificationStore.setState({ activeToast: toast });

    render(<ToastBanner />);

    // Before 4 seconds, activeToast should still be set
    act(() => {
      jest.advanceTimersByTime(3999);
    });
    expect(useNotificationStore.getState().activeToast).toEqual(toast);

    // After 4 seconds the timeout fires, slideOut is called, and withTiming
    // callback immediately invokes dismiss → dequeueToast
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(useNotificationStore.getState().activeToast).toBeNull();
  });

  it("tap handler calls router.push with correct gasp viewer route then calls dequeueToast", () => {
    const toast = makeToast({
      gaspId: "gasp-xyz",
      route: "/(modals)/view-gasp?gaspId=gasp-xyz",
    });
    useNotificationStore.setState({ activeToast: toast });

    const { getByText } = render(<ToastBanner />);

    // Tap the banner (find by sender name text)
    fireEvent.press(getByText("Alice"));

    // router.push should be called with the gasp viewer route
    expect(router.push).toHaveBeenCalledWith(
      "/(modals)/view-gasp?gaspId=gasp-xyz",
    );

    // dequeueToast should have been called — activeToast is now null
    expect(useNotificationStore.getState().activeToast).toBeNull();
  });

  it('renders actor-first copy with an accessible notification button', () => {
    useNotificationStore.setState({ activeToast: makeToast({
      title: 'Alice',
      body: 'sent you a gasp',
      actorName: 'Alice',
      actorAvatarUrl: 'https://example.com/alice.jpg',
    }) });

    const { getByRole, getByText } = render(<ToastBanner />);

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('sent you a gasp')).toBeTruthy();
    expect(getByRole('button', { name: 'Alice: sent you a gasp' })).toBeTruthy();
  });

  it('renders a stable identity fallback when no media or avatar is available', () => {
    useNotificationStore.setState({ activeToast: makeToast({
      imageUri: undefined,
      blurhash: undefined,
      actorAvatarUrl: undefined,
      actorName: 'Alice',
      title: 'Alice',
    }) });

    const { getByText } = render(<ToastBanner />);

    expect(getByText('A')).toBeTruthy();
  });

  it('keeps gasp background and thumbnail previews permanently blurred', () => {
    useNotificationStore.setState({ activeToast: makeToast({
      imageUri: 'https://example.com/gasp.jpg',
      blurhash: 'LKO2?U%2Tw=w',
    }) });

    const { getByTestId } = render(<ToastBanner />);

    expect(getByTestId('notification-toast-background').props.blurRadius).toBe(60);
    expect(getByTestId('notification-toast-visual').props.blurRadius).toBe(60);
    expect(getByTestId('notification-toast-privacy-overlay')).toBeTruthy();
  });

  it('does not blur actor avatars on non-media notifications', () => {
    useNotificationStore.setState({ activeToast: makeToast({
      kind: 'friend.request',
      imageUri: undefined,
      blurhash: undefined,
      actorAvatarUrl: 'https://example.com/alice.jpg',
    }) });

    const { getByTestId } = render(<ToastBanner />);

    expect(getByTestId('notification-toast-visual').props.blurRadius).toBe(0);
    expect(() => getByTestId('notification-toast-privacy-overlay')).toThrow();
  });

  it("after dequeueToast runs, the store promotes the next queue item as the new activeToast", () => {
    const first = makeToast({
      id: "toast-1",
      gaspId: "gasp-1",
      body: "Alice",
    });
    const second = makeToast({
      id: "toast-2",
      gaspId: "gasp-2",
      body: "Bob",
    });

    // Set up: first is active, second is in queue
    useNotificationStore.setState({ activeToast: first, toastQueue: [second] });

    render(<ToastBanner />);

    // Let the 4-second auto-dismiss fire
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // After dismiss, activeToast is cleared
    expect(useNotificationStore.getState().activeToast).toBeNull();

    // After the 500ms inter-toast gap, the next item is promoted
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(useNotificationStore.getState().activeToast).toEqual(second);
    expect(useNotificationStore.getState().toastQueue).toHaveLength(0);
  });
});
