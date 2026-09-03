import { create } from 'zustand';

import type { WarrantyStatus } from '@/features/purchases/warranty';

type PurchaseFilterState = {
  query: string;
  status: WarrantyStatus | 'all';
  category: string | null;
  setQuery: (query: string) => void;
  setStatus: (status: WarrantyStatus | 'all') => void;
  setCategory: (category: string | null) => void;
  reset: () => void;
};

export const usePurchaseFilter = create<PurchaseFilterState>((set) => ({
  query: '',
  status: 'all',
  category: null,
  setQuery: (query) => set({ query }),
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  reset: () => set({ query: '', status: 'all', category: null }),
}));
