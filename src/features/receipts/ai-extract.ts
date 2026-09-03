import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

import { extractedReceiptSchema, type PurchaseFormValues } from '@/features/purchases/schema';
import type { ExtractionField, ReceiptExtraction } from '@/features/receipts/extract';
import type { PickedReceipt } from '@/features/receipts/pick';
import { supabase } from '@/lib/supabase';

const EXTRACTION_FIELDS: ExtractionField[] = [
  'product_name',
  'brand',
  'price',
  'currency',
  'purchase_date',
  'seller',
  'warranty_months',
  'invoice_number',
  'serial_number',
];

/** Thrown for anything worth showing the user; the message is already safe to display. */
export class AiExtractionError extends Error {}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

/** `readAsStringAsync` only reads `file://` URIs; web pickers hand back `blob:`/`data:` ones. */
async function readBase64(file: PickedReceipt): Promise<string> {
  if (process.env.EXPO_OS === 'web') {
    const response = await fetch(file.uri);
    return arrayBufferToBase64(await response.arrayBuffer());
  }
  return readAsStringAsync(file.uri, { encoding: EncodingType.Base64 });
}

/**
 * Sends the receipt image to the `parse-receipt` Supabase Edge Function,
 * which asks Groq's vision model to read it directly and holds the API key
 * server-side. Throws `AiExtractionError` on any failure; `scanReceipt`
 * decides what to do next (fall back to on-device OCR, or report unsupported).
 *
 * Images only — the vision model behind this endpoint cannot read PDFs, so
 * `scanReceipt` never calls this for a PDF.
 */
export async function extractWithAi(file: PickedReceipt): Promise<ReceiptExtraction> {
  const fileBase64 = await readBase64(file);

  const { data, error } = await supabase.functions.invoke<{
    fields?: Record<string, unknown>;
    error?: string;
  }>('parse-receipt', { body: { fileBase64, mimeType: file.mimeType } });

  if (error) throw new AiExtractionError(error.message);
  if (!data || data.error) {
    throw new AiExtractionError(data?.error ?? 'The receipt could not be read.');
  }

  const parsed = extractedReceiptSchema.safeParse(data.fields ?? {});
  if (!parsed.success) throw new AiExtractionError('The receipt could not be read.');

  const candidate = parsed.data as Partial<PurchaseFormValues>;
  const filled = EXTRACTION_FIELDS.filter((key) => {
    const value = candidate[key];
    return value !== null && value !== undefined && value !== '';
  });

  const values: Partial<PurchaseFormValues> = {};
  for (const key of filled) {
    Object.assign(values, { [key]: candidate[key] });
  }

  return { values, filled };
}
