import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSignedUrl,
  deleteReceipt,
  getReceipt,
  listReceipts,
  uploadReceipt,
} from '@/features/receipts/api';
import type { PickedReceipt } from '@/features/receipts/pick';
import type { ReceiptRow } from '@/lib/database.types';

export const receiptKeys = {
  all: ['receipts'] as const,
  list: (purchaseId: string) => [...receiptKeys.all, 'list', purchaseId] as const,
  detail: (id: string) => [...receiptKeys.all, 'detail', id] as const,
  signedUrl: (filePath: string) => [...receiptKeys.all, 'signed-url', filePath] as const,
};

export function useReceipts(purchaseId: string) {
  return useQuery({
    queryKey: receiptKeys.list(purchaseId),
    queryFn: () => listReceipts(purchaseId),
    enabled: Boolean(purchaseId),
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: receiptKeys.detail(id),
    queryFn: () => getReceipt(id),
    enabled: Boolean(id),
  });
}

/**
 * Signed URLs expire, so this refetches well before the hour is up rather than
 * handing a stale URL to an <Image> that would silently fail to load.
 */
export function useSignedUrl(filePath: string | null | undefined) {
  return useQuery({
    queryKey: receiptKeys.signedUrl(filePath ?? ''),
    queryFn: () => createSignedUrl(filePath!),
    enabled: Boolean(filePath),
    staleTime: 45 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
  });
}

export function useUploadReceipt(purchaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: PickedReceipt) => uploadReceipt(purchaseId, file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: receiptKeys.list(purchaseId) }),
  });
}

export function useDeleteReceipt(purchaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receipt: ReceiptRow) => deleteReceipt(receipt),
    // `onSettled`, not `onSuccess`: the row is deleted before the storage
    // object, so a failure partway through still changes what the list holds.
    onSettled: () => queryClient.invalidateQueries({ queryKey: receiptKeys.list(purchaseId) }),
  });
}
