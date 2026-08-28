/**
 * One recognized line of text, with its position on the page.
 *
 * Geometry is normalized to 0–1 with the origin at the **top left**, so it is
 * independent of the source image's pixel size. Apple Vision reports from the
 * bottom left and ML Kit reports in pixels; both are converted natively so the
 * JS side sees one convention.
 */
export type OcrLine = {
  text: string;
  /** 0–1. Apple Vision reports a real value; ML Kit has none, so it reports 1. */
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrResult = {
  /** Every line joined top-to-bottom, in reading order. */
  text: string;
  /** Lines sorted top-to-bottom, then left-to-right. */
  lines: OcrLine[];
  /** Pixel size of the image that was read. */
  width: number;
  height: number;
};
