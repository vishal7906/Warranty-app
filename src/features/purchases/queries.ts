import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPurchase,
  deletePurchase,
  getPurchase,
  listPurchases,
  updatePurchase,
} from '@/features/purchases/api';
import type { PurchaseFormOutput } from '@/features/purchases/schema';

export const purchaseKeys = {
  all: ['purchases'] as const,
  list: () => [...purchaseKeys.all, 'list'] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
};

export function usePurchases() {
  return useQuery({ queryKey: purchaseKeys.list(), queryFn: listPurchases });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => getPurchase(id),
    enabled: Boolean(id),
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PurchaseFormOutput) => createPurchase(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseKeys.all }),
  });
}

export function useUpdatePurchase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PurchaseFormOutput) => updatePurchase(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseKeys.all }),
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePurchase(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseKeys.all }),
  });
}
