import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_CATEGORIES, type CategoryOption } from '@/constants/categories';

type CategoriesState = {
  customCategories: string[];
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
};

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      customCategories: [],
      addCategory: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const known = [...DEFAULT_CATEGORIES.map((c) => c.label), ...state.customCategories];
          if (known.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
            return state;
          }
          return { customCategories: [...state.customCategories, trimmed] };
        }),
      removeCategory: (name) =>
        set((state) => ({
          customCategories: state.customCategories.filter((c) => c !== name),
        })),
    }),
    { name: 'warranty-app/custom-categories', storage: createJSONStorage(() => AsyncStorage) }
  )
);

/** Predefined categories plus any the user has created, deduped case-insensitively. */
export function useCategoryOptions(): CategoryOption[] {
  const custom = useCategoriesStore((state) => state.customCategories);

  return useMemo(() => {
    const extra = custom
      .filter(
        (name) => !DEFAULT_CATEGORIES.some((c) => c.label.toLowerCase() === name.toLowerCase())
      )
      .sort((a, b) => a.localeCompare(b))
      .map((name): CategoryOption => ({ key: name, label: name, emoji: '🏷️' }));

    return [...DEFAULT_CATEGORIES, ...extra];
  }, [custom]);
}
