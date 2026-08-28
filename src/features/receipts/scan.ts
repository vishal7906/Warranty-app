import { extractPurchase, type ReceiptExtraction } from '@/features/receipts/extract';
import { isPdf, type PickedReceipt } from '@/features/receipts/pick';

export type ScanOutcome =
  /** Text was read and at least one field came out of it. */
  | { status: 'extracted'; extraction: ReceiptExtraction }
  /** The image was read but nothing usable was found. */
  | { status: 'nothing-found' }
  /** Scanning could not run at all; `reason` is safe to show the user. */
  | { status: 'unsupported'; reason: string };

/**
 * Loads the OCR module lazily.
 *
 * `requireNativeModule` throws at import time when the native code is not in
 * the binary — which is the case in Expo Go. Importing it at the top of a
 * screen would take the whole screen down there, so it is resolved on demand
 * and a failure degrades to manual entry.
 */
async function loadRecognizer() {
  try {
    const module = await import('@/modules/receipt-ocr');
    return module.recognizeText;
  } catch {
    return null;
  }
}

/**
 * Reads a picked receipt and turns it into form values. Never throws — every
 * failure is a `ScanOutcome` the form can explain, because a bad scan should
 * always fall back to typing rather than blocking the purchase.
 */
export async function scanReceipt(file: PickedReceipt): Promise<ScanOutcome> {
  if (isPdf(file.mimeType)) {
    return {
      status: 'unsupported',
      reason: 'PDFs cannot be scanned on-device. The file is still attached.',
    };
  }

  if (process.env.EXPO_OS === 'web') {
    return {
      status: 'unsupported',
      reason: 'Scanning needs the iOS or Android app. The file is still attached.',
    };
  }

  const recognizeText = await loadRecognizer();
  if (!recognizeText) {
    return {
      status: 'unsupported',
      reason:
        'Scanning needs a development build — it is unavailable in Expo Go. The file is still attached.',
    };
  }

  try {
    const result = await recognizeText(file.uri);
    const extraction = extractPurchase(result);

    if (extraction.filled.length === 0) {
      return { status: 'nothing-found' };
    }
    return { status: 'extracted', extraction };
  } catch (cause) {
    return {
      status: 'unsupported',
      reason:
        cause instanceof Error
          ? `${cause.message} The file is still attached.`
          : 'The receipt could not be read. The file is still attached.',
    };
  }
}
