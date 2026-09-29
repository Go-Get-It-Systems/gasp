import ProductUpdatesScreen from '../product-updates';
import type { ProductUpdate } from '@/services/api/schemas/productUpdate.schema';
import { fireEvent, render } from '@testing-library/react-native';

const mockReactNative = require('react-native');

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockMarkRead = jest.fn();
const mockSubmitFeedback = jest.fn();
let mockShowEmpty = false;

const mockUpdate: ProductUpdate = {
  id: 'reaction-results',
  status: 'released',
  publishedAt: '2026-08-05T10:00:00.000Z',
  actionRoute: '/(tabs)/chat',
  content: {
    'pt-BR': { title: 'Reações', summary: 'Resumo', highlights: ['Detalhe'], actionLabel: 'Abrir' },
    en: { title: 'Reactions', summary: 'Summary', highlights: ['Detail'], actionLabel: 'Open chats' },
  },
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'person-1' } }),
}));
jest.mock('@/hooks/useProductUpdates', () => ({
  useProductUpdates: () => ({
    sections: mockShowEmpty ? [] : [{ title: 'August 2026', data: [mockUpdate] }],
    updates: [mockUpdate],
    unreadUpdateIds: ['reaction-results'],
    unreadCount: 1,
    feedbackByUpdateId: {},
    isReady: true,
    markRead: mockMarkRead,
    submitFeedback: mockSubmitFeedback,
  }),
}));
jest.mock('@/services/productUpdatesAnalytics', () => ({ trackProductUpdatesEvent: jest.fn() }));
jest.mock('@/components/ui/IconButton', () => ({
  IconButton: ({ onPress, accessibilityLabel }: { onPress?: () => void; accessibilityLabel?: string }) => (
    <mockReactNative.Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} />
  ),
}));
jest.mock('@/components/product-updates/ProductUpdateDetail', () => ({
  ProductUpdateDetail: ({ onAction, onFeedback }: { onAction: () => void; onFeedback: (helpful: boolean) => void }) => (
    <>
      <mockReactNative.Pressable accessibilityRole="button" accessibilityLabel="Open chats" onPress={onAction}><mockReactNative.Text>Open chats</mockReactNative.Text></mockReactNative.Pressable>
      <mockReactNative.Pressable accessibilityRole="button" accessibilityLabel="Yes" onPress={() => onFeedback(true)}><mockReactNative.Text>Yes</mockReactNative.Text></mockReactNative.Pressable>
    </>
  ),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, string>) => {
      const copy: Record<string, string> = {
        'productUpdates.title': "What's new",
        'productUpdates.subtitle': 'See what changed.',
        'productUpdates.close': 'Close',
        'productUpdates.empty': 'No updates',
        'productUpdates.new': 'New',
        'productUpdates.status.released': 'Released',
      };
      if (key === 'productUpdates.openUpdate') return `Open update: ${values?.title}`;
      return copy[key] ?? key;
    },
  }),
}));

describe('ProductUpdatesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowEmpty = false;
  });

  it('tracks opening, marks an update read, and follows its configured CTA', () => {
    const { getByRole } = render(<ProductUpdatesScreen />);
    const { trackProductUpdatesEvent } = jest.requireMock('@/services/productUpdatesAnalytics') as {
      trackProductUpdatesEvent: jest.Mock;
    };

    expect(trackProductUpdatesEvent).toHaveBeenCalledWith({ name: 'product_updates_opened', source: 'profile', unread_count: 1 });
    fireEvent.press(getByRole('button', { name: 'Close' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    fireEvent.press(getByRole('button', { name: 'Open update: Reactions' }));
    expect(mockMarkRead).toHaveBeenCalledWith('reaction-results');
    expect(trackProductUpdatesEvent).toHaveBeenCalledWith({
      name: 'product_update_viewed', update_id: 'reaction-results', status: 'released', position: 1,
    });

    fireEvent.press(getByRole('button', { name: 'Open chats' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/chat');

    fireEvent.press(getByRole('button', { name: 'Yes' }));
    expect(mockSubmitFeedback).toHaveBeenCalledWith('reaction-results', true);
    expect(trackProductUpdatesEvent).toHaveBeenCalledWith({
      name: 'product_update_feedback_submitted', update_id: 'reaction-results', helpful: true,
    });
  });

  it('shows the empty state when the catalog has no published entries', () => {
    mockShowEmpty = true;
    const { getByText } = render(<ProductUpdatesScreen />);

    expect(getByText('No updates')).toBeTruthy();
  });
});
