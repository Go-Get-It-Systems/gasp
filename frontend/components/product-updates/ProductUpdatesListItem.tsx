import { useCallback } from 'react';
import { ProductUpdateCard } from '@/components/product-updates/ProductUpdateCard';
import type { ProductUpdate } from '@/services/api/schemas/productUpdate.schema';

interface ProductUpdatesListItemProps {
  update: ProductUpdate;
  language?: string;
  isUnread: boolean;
  onOpen: (update: ProductUpdate) => void;
}

export function ProductUpdatesListItem({ update, language, isUnread, onOpen }: ProductUpdatesListItemProps) {
  const handlePress = useCallback(() => onOpen(update), [onOpen, update]);

  return <ProductUpdateCard update={update} language={language} isUnread={isUnread} onPress={handlePress} />;
}
