import { ProductUpdateCard } from '@/components/product-updates/ProductUpdateCard';
import { ProductUpdateDetail } from '@/components/product-updates/ProductUpdateDetail';
import type { ProductUpdate } from '@/services/api/schemas/productUpdate.schema';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/components/ui/InlineVideo', () => ({
  InlineVideo: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const copy: Record<string, string> = {
        'productUpdates.status.released': 'Released',
        'productUpdates.new': 'New',
        'productUpdates.whatChanged': 'What changed',
        'productUpdates.helpfulQuestion': 'Was this helpful?',
        'productUpdates.helpfulYes': 'Yes',
        'productUpdates.helpfulNo': 'Not yet',
        'common.goBack': 'Go back',
      };
      if (key === 'productUpdates.openUpdate') return `Open update: ${values?.title}`;
      return copy[key] ?? key;
    },
  }),
}));

const update: ProductUpdate = {
  id: 'reaction-results',
  status: 'released',
  publishedAt: '2026-08-05T10:00:00.000Z',
  actionRoute: '/(tabs)/chat',
  content: {
    'pt-BR': { title: 'Reações', summary: 'Resumo', highlights: ['Detalhe'], actionLabel: 'Abrir' },
    en: { title: 'Reactions', summary: 'Summary', highlights: ['Detail'], actionLabel: 'Open chats' },
  },
};

describe('Product Updates components', () => {
  it('exposes an accessible unread update card', () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = render(<ProductUpdateCard update={update} language="en" isUnread onPress={onPress} />);

    expect(getByText('New')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Open update: Reactions' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a working CTA and persistent feedback selection controls', () => {
    const onAction = jest.fn();
    const onFeedback = jest.fn();
    const { getByRole } = render(
      <ProductUpdateDetail
        update={update}
        language="en"
        onBack={jest.fn()}
        onAction={onAction}
        onFeedback={onFeedback}
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Open chats' }));
    fireEvent.press(getByRole('button', { name: 'Yes' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onFeedback).toHaveBeenCalledWith(true);
  });
});
