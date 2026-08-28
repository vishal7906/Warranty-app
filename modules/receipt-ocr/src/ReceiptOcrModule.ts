import { NativeModule, requireNativeModule } from 'expo';

import type { OcrResult } from './ReceiptOcr.types';

declare class ReceiptOcrModule extends NativeModule<Record<never, never>> {
  /**
   * Runs text recognition over a local image.
   *
   * @param uri A `file://` URI. Remote URLs are not downloaded.
   */
  recognizeText(uri: string): Promise<OcrResult>;
}

export default requireNativeModule<ReceiptOcrModule>('ReceiptOcr');
