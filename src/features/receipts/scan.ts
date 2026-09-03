import { extractWithAi } from '@/features/receipts/ai-extract';
import { extractPurchase, type ReceiptExtraction } from '@/features/receipts/extract';
import { isPdf, type PickedReceipt } from '@/features/receipts/pick';

export type ScanOutcome =
  /** Fields came out of it — via the AI extractor, or on-device OCR as a fallback. */
  | { status: 'extracted'; extraction: ReceiptExtraction }
  /** The file was read but nothing usable was found. */
  | { status: 'nothing-found' }
  /** Scanning could not run at all; `reason` is safe to show the user. */
  | { status: 'unsupported'; reason: string };

/**
 * Loads the on-device OCR module lazily.
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

/** On-device regex extraction: the fallback when the AI extractor can't be reached. */
async function scanOnDevice(file: PickedReceipt): Promise<ScanOutcome> {
  const recognizeText = await loadRecognizer();
  if (!recognizeText) {
    return {
      status: 'unsupported',
      reason:
        'The receipt could not be read, and offline scanning needs a development build. The file is still attached.',
    };
  }

  try {
    const result = await recognizeText(file.uri);
    const extraction = extractPurchase(result);

    if (extraction.filled.length === 0) {
      return { status: 'nothing-found' };
    }
    return { status: 'extracted', extraction };
  } catch {
    return {
      status: 'unsupported',
      reason: 'The receipt could not be read. The file is still attached.',
    };
  }
}

/**
 * Reads a picked receipt and turns it into form values. Never throws — every
 * failure is a `ScanOutcome` the form can explain, because a bad scan should
 * always fall back to typing rather than blocking the purchase.
 *
 * Images go to the AI extractor first, which reads the actual layout instead
 * of a flattened, error-prone OCR string; on-device OCR only runs as a
 * fallback when that request fails (offline, or a server-side hiccup). PDFs
 * skip both — the vision model can't read them and neither can the on-device
 * recognizer — so they are attached without a scan.
 */
export async function scanReceipt(file: PickedReceipt): Promise<ScanOutcome> {
  if (isPdf(file.mimeType)) {
    return {
      status: 'unsupported',
      reason: 'PDFs cannot be scanned yet. The file is still attached.',
    };
  }

  if (process.env.EXPO_OS === 'web') {
    return {
      status: 'unsupported',
      reason: 'Scanning needs the iOS or Android app. The file is still attached.',
    };
  }

  try {
    const extraction = await extractWithAi(file);
    if (extraction.filled.length === 0) {
      return { status: 'nothing-found' };
    }
    return { status: 'extracted', extraction };
  } catch {
    // Any failure here — offline, a bad server response, a misconfigured key
    // — falls back to on-device OCR rather than giving up, since a worse
    // guess still beats none.
    return scanOnDevice(file);
  }
}
