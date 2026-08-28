import ReceiptOcrModule from './src/ReceiptOcrModule';
import type { OcrResult } from './src/ReceiptOcr.types';

export type { OcrLine, OcrResult } from './src/ReceiptOcr.types';

/**
 * Reads the text off a receipt image using the platform's on-device engine —
 * Apple Vision on iOS, ML Kit on Android. Nothing leaves the device.
 *
 * @param uri A local `file://` URI, as returned by the image and document
 *   pickers. PDFs are not supported; neither engine rasterizes one.
 */
export async function recognizeText(uri: string): Promise<OcrResult> {
  return ReceiptOcrModule.recognizeText(uri);
}
