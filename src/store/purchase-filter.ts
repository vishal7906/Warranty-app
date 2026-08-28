import { create } from 'zustand';

import type { WarrantyStatus } from '@/features/purchases/warranty';

type PurchaseFilterState = {
  query: string;
  status: WarrantyStatus | 'all';
  setQuery: (query: string) => void;
  setStatus: (status: WarrantyStatus | 'all') => void;
  reset: () => void;
};

export const usePurchaseFilter = create<PurchaseFilterState>((set) => ({
  query: '',
  status: 'all',
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  reset: () => set({ query: '', status: 'all' }),
}));
