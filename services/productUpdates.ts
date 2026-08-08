import type {
  ProductUpdate,
  ProductUpdateContent,
  ProductUpdateStatus,
  ProductUpdateUserState,
} from '@/services/api/schemas/productUpdate.schema';

export type ProductUpdatesLocale = 'pt-BR' | 'en';

export interface ProductUpdateSection {
  title: string;
  data: ProductUpdate[];
}

const AVAILABLE_STATUSES: ProductUpdateStatus[] = ['released', 'improved'];
const EMPTY_STATE: ProductUpdateUserState = { readUpdateIds: [], feedbackByUpdateId: {} };

export function emptyProductUpdateState(): ProductUpdateUserState {
  return { ...EMPTY_STATE, readUpdateIds: [], feedbackByUpdateId: {} };
}

export function resolveProductUpdatesLocale(language?: string): ProductUpdatesLocale {
  return language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function getProductUpdateContent(update: ProductUpdate, language?: string): ProductUpdateContent {
  return update.content[resolveProductUpdatesLocale(language)] ?? update.content.en;
}

export function isAvailableProductUpdate(status: ProductUpdateStatus): boolean {
  return AVAILABLE_STATUSES.includes(status);
}

export function sortProductUpdates(updates: ProductUpdate[]): ProductUpdate[] {
  return [...updates].sort((first, second) => {
    const availabilityDifference = Number(isAvailableProductUpdate(second.status)) - Number(isAvailableProductUpdate(first.status));
    if (availabilityDifference !== 0) return availabilityDifference;
    return new Date(second.publishedAt).getTime() - new Date(first.publishedAt).getTime();
  });
}

export function getUnreadUpdateIds(updates: ProductUpdate[], state: ProductUpdateUserState): string[] {
  return sortProductUpdates(updates)
    .filter((update) => !state.readUpdateIds.includes(update.id))
    .slice(0, 5)
    .map((update) => update.id);
}

export function groupProductUpdatesByMonth(updates: ProductUpdate[], language?: string): ProductUpdateSection[] {
  const locale = resolveProductUpdatesLocale(language);
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const grouped = new Map<string, ProductUpdate[]>();

  for (const update of sortProductUpdates(updates)) {
    const title = isAvailableProductUpdate(update.status)
      ? formatter.format(new Date(update.publishedAt))
      : locale === 'pt-BR' ? 'O que estamos preparando' : 'What we are working on';
    grouped.set(title, [...(grouped.get(title) ?? []), update]);
  }

  return [...grouped.entries()].map(([title, data]) => ({ title, data }));
}

export function markProductUpdateRead(state: ProductUpdateUserState, updateId: string): ProductUpdateUserState {
  if (state.readUpdateIds.includes(updateId)) return state;
  return { ...state, readUpdateIds: [...state.readUpdateIds, updateId] };
}

export function setProductUpdateFeedback(
  state: ProductUpdateUserState,
  updateId: string,
  helpful: boolean,
): ProductUpdateUserState {
  return {
    ...state,
    feedbackByUpdateId: { ...state.feedbackByUpdateId, [updateId]: helpful },
  };
}
