import { NativeModule, registerWebModule } from 'expo';

import type { OcrResult } from './ReceiptOcr.types';

/**
 * There is no on-device text recognition in the browser. The web build keeps
 * the manual form, so this rejects rather than pretending to read anything.
 */
class ReceiptOcrModule extends NativeModule<Record<never, never>> {
  async recognizeText(): Promise<OcrResult> {
    throw new Error('Receipt scanning is only available on iOS and Android.');
  }
}

export default registerWebModule(ReceiptOcrModule, 'ReceiptOcrModule');
