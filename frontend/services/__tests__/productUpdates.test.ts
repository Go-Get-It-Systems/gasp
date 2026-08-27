import type { ProductUpdate, ProductUpdateUserState } from '@/services/api/schemas/productUpdate.schema';
import { ProductUpdateCatalogSchema } from '@/services/api/schemas/productUpdate.schema';
import {
  getProductUpdateContent,
  getUnreadUpdateIds,
  groupProductUpdatesByMonth,
  markProductUpdateRead,
  setProductUpdateFeedback,
  sortProductUpdates,
} from '@/services/productUpdates';

const state: ProductUpdateUserState = { readUpdateIds: [], feedbackByUpdateId: {} };

function update(id: string, status: ProductUpdate['status'], publishedAt: string): ProductUpdate {
  return {
    id,
    status,
    publishedAt,
    content: {
      'pt-BR': { title: `${id} pt`, summary: 'Resumo', highlights: ['Detalhe'] },
      en: { title: `${id} en`, summary: 'Summary', highlights: ['Detail'] },
    },
  };
}

describe('product update helpers', () => {
  it('lists available updates before future-facing ones, then sorts each group by date', () => {
    const updates = [
      update('future-new', 'in_progress', '2026-08-05T00:00:00.000Z'),
      update('available-old', 'released', '2026-08-01T00:00:00.000Z'),
      update('available-new', 'improved', '2026-08-04T00:00:00.000Z'),
      update('future-old', 'coming_soon', '2026-07-01T00:00:00.000Z'),
    ];

    expect(sortProductUpdates(updates).map((item) => item.id)).toEqual([
      'available-new',
      'available-old',
      'future-new',
      'future-old',
    ]);
  });

  it('caps unread labels at five and excludes previously read updates', () => {
    const updates = Array.from({ length: 7 }, (_, index) =>
      update(`update-${index}`, 'released', `2026-08-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
    );

    expect(getUnreadUpdateIds(updates, { ...state, readUpdateIds: ['update-6'] })).toEqual([
      'update-5',
      'update-4',
      'update-3',
      'update-2',
      'update-1',
    ]);
  });

  it('groups future-facing updates separately and uses Portuguese content when requested', () => {
    const released = update('released', 'released', '2026-08-01T00:00:00.000Z');
    const future = update('future', 'in_progress', '2026-08-02T00:00:00.000Z');

    expect(groupProductUpdatesByMonth([released, future], 'pt-BR')).toEqual([
      expect.objectContaining({ title: expect.stringMatching(/agosto/i), data: [released] }),
      { title: 'O que estamos preparando', data: [future] },
    ]);
    expect(getProductUpdateContent(released, 'pt').title).toBe('released pt');
    expect(getProductUpdateContent(released, 'en').title).toBe('released en');
  });

  it('keeps read ids unique and replaces feedback for the same update', () => {
    const readState = markProductUpdateRead(state, 'update-1');

    expect(markProductUpdateRead(readState, 'update-1')).toEqual(readState);
    expect(setProductUpdateFeedback(setProductUpdateFeedback(readState, 'update-1', true), 'update-1', false))
      .toEqual({ readUpdateIds: ['update-1'], feedbackByUpdateId: { 'update-1': false } });
  });

  it('rejects catalog entries without both supported locales', () => {
    expect(ProductUpdateCatalogSchema.safeParse([{
      id: 'missing-translation',
      status: 'released',
      publishedAt: '2026-08-05T00:00:00.000Z',
      content: { en: { title: 'Title', summary: 'Summary', highlights: ['Detail'] } },
    }]).success).toBe(false);
  });
});
