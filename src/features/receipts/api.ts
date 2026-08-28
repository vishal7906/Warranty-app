import { File } from 'expo-file-system';

import { extensionFor, MAX_RECEIPT_BYTES, type PickedReceipt } from '@/features/receipts/pick';
import type { ReceiptRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export const RECEIPTS_BUCKET = 'receipts';

/** How long a viewing URL stays valid. Long enough to open, short enough to leak little. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Reads a picked file into memory as an `ArrayBuffer`.
 *
 * React Native's `fetch` cannot read `file://` URIs, and supabase-js sends a
 * `Blob` as multipart — so neither of the obvious approaches works here. Raw
 * bytes are passed through as the request body instead.
 */
async function readBytes(file: PickedReceipt): Promise<ArrayBuffer> {
  if (process.env.EXPO_OS === 'web') {
    // Web pickers hand back `blob:` and `data:` URLs, which fetch does read.
    const response = await fetch(file.uri);
    return response.arrayBuffer();
  }

  const handle = new File(file.uri);
  const bytes = await handle.bytes();
  // `bytes.buffer` can be a larger pooled allocation, so slice to this view's
  // own range rather than uploading whatever else shares the buffer.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Storage keys are `<user_id>/<purchase_id>/<file>`. The leading segment is
 * what the bucket's RLS policy checks against `auth.uid()`, so it is not
 * cosmetic — changing the layout requires changing `supabase/schema.sql`.
 */
function buildStoragePath(userId: string, purchaseId: string, file: PickedReceipt): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${purchaseId}/${unique}.${extensionFor(file)}`;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('You need to be signed in to upload a receipt.');
  return data.user.id;
}

export async function listReceipts(purchaseId: string): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('purchase_id', purchaseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getReceipt(id: string): Promise<ReceiptRow> {
  const { data, error } = await supabase.from('receipts').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

/**
 * Uploads the file, then records it. If the row insert fails the just-uploaded
 * object is removed, so storage never accumulates files nothing points at.
 */
export async function uploadReceipt(
  purchaseId: string,
  file: PickedReceipt
): Promise<ReceiptRow> {
  const userId = await requireUserId();
  const body = await readBytes(file);

  // Pickers do not always report a size, so this is the check that always runs.
  if (body.byteLength > MAX_RECEIPT_BYTES) {
    throw new Error('That file is larger than 10 MB. Try a smaller scan.');
  }

  const path = buildStoragePath(userId, purchaseId, file);
  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, body, { contentType: file.mimeType, upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      purchase_id: purchaseId,
      user_id: userId,
      file_path: path,
      file_type: file.mimeType,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
    throw error;
  }

  return data;
}

/** The bucket is private, so every view needs a freshly signed, expiring URL. */
export async function createSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteReceipt(receipt: ReceiptRow): Promise<void> {
  // Row first: a delete that half-fails should leave an orphaned file (which
  // `removeReceiptFiles` can still sweep) rather than a row pointing at nothing.
  const { error } = await supabase.from('receipts').delete().eq('id', receipt.id);
  if (error) throw error;

  const { error: storageError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([receipt.file_path]);
  if (storageError) throw storageError;
}

/**
 * Deletes every stored file for a purchase.
 *
 * Deleting a purchase cascades to its `receipts` rows in Postgres, but storage
 * knows nothing about that, so the objects have to be removed here first.
 */
export async function removeReceiptFiles(purchaseId: string): Promise<void> {
  const receipts = await listReceipts(purchaseId);
  if (receipts.length === 0) return;

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove(receipts.map((receipt) => receipt.file_path));

  if (error) throw error;
}
