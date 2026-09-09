import type { PurchaseRow } from '@/lib/database.types';

export type ExpiringItem = Pick<
  PurchaseRow,
  'id' | 'product_name' | 'brand' | 'category' | 'purchase_date' | 'warranty_end'
>;
