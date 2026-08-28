/**
 * Turns recognized receipt text into purchase-form values.
 *
 * Everything here is a heuristic over unstructured text, so it is wrong
 * sometimes by construction — which is why nothing it produces is ever saved
 * without the user seeing it first. `filled` reports which fields were guessed
 * so the form can mark them for review.
 *
 * Kept as a pure function over `OcrResult` so it can be tuned and tested
 * without rebuilding the native module.
 */

import { isValid, parse } from 'date-fns';

import type { PurchaseFormValues } from '@/features/purchases/schema';
import { toISODate } from '@/features/purchases/warranty';
import type { OcrLine, OcrResult } from '@/modules/receipt-ocr';

export type ExtractionField =
  | 'product_name'
  | 'brand'
  | 'price'
  | 'currency'
  | 'purchase_date'
  | 'seller'
  | 'warranty_months'
  | 'invoice_number'
  | 'serial_number';

export type ReceiptExtraction = {
  values: Partial<PurchaseFormValues>;
  /** Fields this parser filled in, in form order. */
  filled: ExtractionField[];
};

// ------------------------------------------------------------------ helpers --

/** Indian grouping (1,23,456.78) as well as western (123,456.78). */
const AMOUNT_PATTERN = /\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g;

const CURRENCY_BY_SYMBOL: { pattern: RegExp; code: string }[] = [
  { pattern: /₹|\brs\.?\b|\binr\b/i, code: 'INR' },
  { pattern: /\$|\busd\b/i, code: 'USD' },
  { pattern: /€|\beur\b/i, code: 'EUR' },
  { pattern: /£|\bgbp\b/i, code: 'GBP' },
  { pattern: /¥|\bjpy\b/i, code: 'JPY' },
  { pattern: /\baed\b|\bdirham/i, code: 'AED' },
];

/**
 * Total labels, most specific first. "Grand total" beats a bare "total", which
 * in turn must not match "subtotal" — hence the explicit boundaries.
 */
const TOTAL_LABELS: RegExp[] = [
  /\bgrand\s*total\b/i,
  /\bamount\s*(payable|due)\b/i,
  /\bnet\s*(amount|payable|total)\b/i,
  /\btotal\s*amount\b/i,
  /\bbalance\s*due\b/i,
  /(?<!sub)(?<!sub[\s-])\btotal\b/i,
];

/** Lines that mention a total but are counting things, not money. */
const NOT_MONEY = /\b(qty|quantity|items?|units?|pieces?|savings?|discount|tax|gst|vat|cgst|sgst)\b/i;

/** Formats that can only be read one way, so they are always tried first. */
const UNAMBIGUOUS_DATE_FORMATS = [
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'd MMM yyyy',
  'dd MMM yyyy',
  'd MMMM yyyy',
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'MMM d yyyy',
  'd-MMM-yyyy',
  'dd-MMM-yyyy',
];

const DAY_FIRST_DATE_FORMATS = [
  'dd/MM/yyyy',
  'd/M/yyyy',
  'dd-MM-yyyy',
  'd-M-yyyy',
  'dd.MM.yyyy',
  'dd/MM/yy',
  'd/M/yy',
  'dd-MM-yy',
];

const MONTH_FIRST_DATE_FORMATS = [
  'MM/dd/yyyy',
  'M/d/yyyy',
  'MM-dd-yyyy',
  'M-d-yyyy',
  'MM.dd.yyyy',
  'MM/dd/yy',
  'M/d/yy',
  'MM-dd-yy',
];

/** Currencies whose receipts are written month-first. */
const MONTH_FIRST_CURRENCIES = new Set(['USD']);

const DATE_CANDIDATE =
  /\b(\d{1,4}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}[\s-][A-Za-z]{3,9}[\s-,]+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/g;

/** Brands worth recognizing outright, spelled as they should be displayed —
 *  anything else falls back to the first word of the product, which is the
 *  brand on most receipts. */
const KNOWN_BRANDS = [
  'Samsung', 'Apple', 'Sony', 'LG', 'OnePlus', 'Xiaomi', 'Redmi', 'realme',
  'OPPO', 'vivo', 'Nothing', 'Motorola', 'Nokia', 'ASUS', 'Acer', 'Dell',
  'Lenovo', 'HP', 'MSI', 'Razer', 'Logitech', 'Bose', 'JBL', 'Sennheiser',
  'Canon', 'Nikon', 'GoPro', 'Dyson', 'Philips', 'Bosch', 'Whirlpool',
  'Godrej', 'Haier', 'Voltas', 'Daikin', 'Panasonic', 'Toshiba', 'Sharp',
  'TCL', 'Hisense', 'boAt', 'Noise', 'Fire-Boltt', 'Garmin', 'Fitbit',
  'Microsoft', 'Google', 'Amazon', 'Anker', 'Seagate', 'SanDisk', 'IFB',
];

/**
 * An invoice or serial number: at least three characters and containing a
 * digit. The digit requirement is what stops a bare label word ("Invoice")
 * from being returned as the value.
 */
const IDENTIFIER = /(?=[A-Za-z0-9/-]*\d)[A-Za-z0-9][A-Za-z0-9/-]{2,}/;

function normalizeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Every money-looking number on a line, largest last. */
function amountsOn(text: string): number[] {
  // Strip identifiers that are digit-heavy but not money, so a GSTIN or a
  // phone number never gets read as a price.
  const withoutIds = text
    .replace(/\b[A-Z]{2,}\d[A-Z0-9]{4,}\b/g, ' ')
    .replace(/\b\d{10,}\b/g, ' ');

  return (withoutIds.match(AMOUNT_PATTERN) ?? [])
    .map(normalizeAmount)
    .filter((value): value is number => value !== null && value > 0);
}

/**
 * Rejoins lines that share a row into one logical line.
 *
 * A receipt's item and its right-aligned amount are one row to a reader, but
 * the gap between the columns is wide enough that both engines report them as
 * separate observations. Without this, "Apple iPhone 17 Pro" and
 * "1,34,900.00" are unrelated strings and every price-aware heuristic below
 * misfires. This is what the per-line geometry is for.
 */
function mergeRows(lines: OcrLine[]): OcrLine[] {
  if (lines.length === 0) return [];

  const sorted = [...lines].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: OcrLine[][] = [];

  for (const line of sorted) {
    const current = rows[rows.length - 1];
    const anchor = current?.[0];

    if (anchor) {
      const centre = line.y + line.height / 2;
      const anchorCentre = anchor.y + anchor.height / 2;
      // Scaled to the text size, so it holds for both a header and fine print.
      const tolerance = Math.max(line.height, anchor.height) * 0.6;
      if (Math.abs(centre - anchorCentre) <= tolerance) {
        current.push(line);
        continue;
      }
    }
    rows.push([line]);
  }

  return rows.map((cells) => {
    const ordered = [...cells].sort((a, b) => a.x - b.x);
    const left = Math.min(...ordered.map((cell) => cell.x));
    const right = Math.max(...ordered.map((cell) => cell.x + cell.width));
    const top = Math.min(...ordered.map((cell) => cell.y));
    const bottom = Math.max(...ordered.map((cell) => cell.y + cell.height));

    return {
      // Two spaces keeps the column break visible to the trailing-price strip.
      text: ordered.map((cell) => cell.text.trim()).join('  '),
      confidence: Math.min(...ordered.map((cell) => cell.confidence)),
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  });
}

function isNoise(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  // Separator rules, and lines with almost no letters.
  if (/^[^A-Za-z0-9]+$/.test(trimmed)) return true;
  const letters = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  return letters < 2;
}

/** Reads the value after a label, either on the same line or the next one. */
function valueAfterLabel(
  lines: OcrLine[],
  index: number,
  label: RegExp
): string | null {
  const text = lines[index].text;
  const match = text.match(label);
  if (!match) return null;

  const after = text.slice((match.index ?? 0) + match[0].length).replace(/^[\s:#.\-–—]+/, '');
  if (after.trim().length > 0) return after.trim();

  // Labels at the end of a line put their value on the next one. That line
  // often restates the label, so strip a leading one rather than returning it.
  const next = lines[index + 1]?.text?.trim();
  if (!next || isNoise(next)) return null;

  const restated = next.match(label);
  if (restated && (restated.index ?? 0) === 0) {
    const remainder = next.slice(restated[0].length).replace(/^[\s:#.\-–—]+/, '').trim();
    return remainder.length > 0 ? remainder : null;
  }
  return next;
}

// ------------------------------------------------------------------- fields --

function extractCurrency(text: string): string | null {
  for (const { pattern, code } of CURRENCY_BY_SYMBOL) {
    if (pattern.test(text)) return code;
  }
  // Plenty of Indian receipts print no symbol at all, but a GST breakdown is
  // as good as one.
  if (/\b(gstin|cgst|sgst|igst|hsn)\b/i.test(text)) return 'INR';
  return null;
}

function extractTotal(lines: OcrLine[]): number | null {
  for (const label of TOTAL_LABELS) {
    // Totals sit at the bottom, so search upward — the last "total" on a
    // receipt is the one that matters when several appear.
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const text = lines[index].text;
      if (!label.test(text) || NOT_MONEY.test(text)) continue;

      const onLine = amountsOn(text);
      if (onLine.length > 0) return Math.max(...onLine);

      // A right-aligned total can land on its own line next to the label.
      const neighbour = lines[index + 1];
      if (neighbour) {
        const nearby = amountsOn(neighbour.text);
        if (nearby.length > 0) return Math.max(...nearby);
      }
    }
  }

  // Nothing labelled: the largest amount on a receipt is usually the total.
  const all = lines.flatMap((line) => (NOT_MONEY.test(line.text) ? [] : amountsOn(line.text)));
  const withDecimals = all.filter((value) => !Number.isInteger(value));
  const pool = withDecimals.length > 0 ? withDecimals : all;
  return pool.length > 0 ? Math.max(...pool) : null;
}

/**
 * `12/03` is either 12 March or 3 December and nothing in the text settles it,
 * so the detected currency casts the deciding vote — a receipt priced in USD
 * is written month-first, and most everywhere else is day-first.
 *
 * Order matters: the first format that parses wins. Genuinely impossible
 * readings (month 25) fail on their own and fall through to the other order.
 */
function parseDateToken(token: string, monthFirst: boolean): Date | null {
  const cleaned = token.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const ambiguous = monthFirst
    ? [...MONTH_FIRST_DATE_FORMATS, ...DAY_FIRST_DATE_FORMATS]
    : [...DAY_FIRST_DATE_FORMATS, ...MONTH_FIRST_DATE_FORMATS];

  for (const format of [...UNAMBIGUOUS_DATE_FORMATS, ...ambiguous]) {
    const parsed = parse(cleaned, format, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function extractDate(lines: OcrLine[], monthFirst: boolean): string | null {
  const labelled = /\b(invoice|bill|order|purchase|txn|transaction)?\s*date\b/i;
  const now = new Date();
  const earliest = new Date(now.getFullYear() - 25, 0, 1);

  const candidates: { date: Date; labelled: boolean }[] = [];

  lines.forEach((line, index) => {
    const isLabelled = labelled.test(line.text);
    const searchIn = isLabelled
      ? `${line.text} ${lines[index + 1]?.text ?? ''}`
      : line.text;

    for (const token of searchIn.match(DATE_CANDIDATE) ?? []) {
      const date = parseDateToken(token, monthFirst);
      // A receipt cannot be from the future, and a 25-year-old one is a misread.
      if (date && date <= now && date >= earliest) {
        candidates.push({ date, labelled: isLabelled });
      }
    }
  });

  if (candidates.length === 0) return null;

  const preferred = candidates.filter((candidate) => candidate.labelled);
  const pool = preferred.length > 0 ? preferred : candidates;
  // The most recent plausible date is the purchase; older ones tend to be
  // manufacture or "member since" dates.
  const best = pool.reduce((a, b) => (b.date > a.date ? b : a));
  return toISODate(best.date);
}

function extractWarrantyMonths(lines: OcrLine[]): number | null {
  const warrantyWord = /\b(warrant(y|ies)|guarantee|protection\s*plan|coverage|amc)\b/i;

  for (let index = 0; index < lines.length; index += 1) {
    if (!warrantyWord.test(lines[index].text)) continue;

    // The duration may trail onto the following line.
    const scope = `${lines[index].text} ${lines[index + 1]?.text ?? ''}`;

    const years = scope.match(/(\d+)\s*(?:years?|yrs?|y)\b/i);
    if (years) {
      const value = Number(years[1]);
      if (value > 0 && value <= 50) return value * 12;
    }

    const months = scope.match(/(\d+)\s*(?:months?|mos?|m)\b/i);
    if (months) {
      const value = Number(months[1]);
      if (value > 0 && value <= 600) return value;
    }
  }
  return null;
}

function extractLabelled(lines: OcrLine[], label: RegExp, clean: RegExp): string | null {
  for (let index = 0; index < lines.length; index += 1) {
    const value = valueAfterLabel(lines, index, label);
    if (!value) continue;

    const match = value.match(clean);
    if (match) return match[0];
  }
  return null;
}

/**
 * The merchant, taken from the top of the receipt — the first line that reads
 * like a name rather than an address, a phone number, or a tax id.
 */
function extractSeller(lines: OcrLine[]): string | null {
  const disqualifying =
    /\b(gstin?|tin|vat|pan|cin|invoice|bill|receipt|tel|phone|mobile|email|www|http|street|road|ave|avenue|lane|floor|nagar|shop\s*no)\b|@|\d{6,}/i;
  // "2200 Broadway", "No. 42, 100 Feet Road" — an address opens with its number.
  const streetNumber = /^\s*(no\.?\s*)?\d+[\s,]/i;

  for (const line of lines.slice(0, 6)) {
    const text = line.text.trim();
    if (isNoise(text) || disqualifying.test(text) || streetNumber.test(text)) continue;

    // A branch number ("BEST BUY #1423") is part of the name, not a reason to
    // read the line as an address, so drop it before weighing the letters.
    const name = text.replace(/#\s*\d+/g, '').replace(/\s+/g, ' ').trim();
    if (name.length < 3 || name.length > 60) continue;

    const letters = (name.match(/[A-Za-z]/g) ?? []).length;
    // A merchant name is mostly letters; an address line is not.
    if (letters / name.length < 0.6) continue;

    return name;
  }
  return null;
}

/**
 * The purchased item. Receipts put it on a line with its price, between the
 * header and the totals, so that is what this looks for.
 */
function extractProductName(lines: OcrLine[], total: number | null): string | null {
  const skip =
    /\b(total|subtotal|tax|gst|vat|cgst|sgst|hsn|sac|discount|change|cash|card|upi|paid|balance|invoice|bill|receipt|date|qty|amount|thank|visit|customer|address|phone|gstin)\b/i;

  const candidates: { text: string; score: number }[] = [];

  for (const line of lines) {
    const text = line.text.trim();
    if (isNoise(text) || skip.test(text)) continue;

    // Strip the trailing price and any quantity column to leave the item name.
    const withoutPrice = text
      .replace(/(?:₹|rs\.?|\$|€|£)?\s*\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{1,2})?\s*$/i, '')
      .replace(/\s+\d+\s*(?:x|nos?|pcs?|qty)?\s*$/i, '')
      .replace(/^\d+\s*[.)]\s*/, '')
      .trim();

    const letters = (withoutPrice.match(/[A-Za-z]/g) ?? []).length;
    if (letters < 4 || withoutPrice.length > 80) continue;

    let score = letters;
    // A line that carried a price is far more likely to be the item.
    const amounts = amountsOn(text);
    if (amounts.length > 0) score += 20;
    // Lines in the middle of the receipt beat header and footer text.
    if (line.y > 0.2 && line.y < 0.75) score += 10;
    // The item priced at the total is almost certainly the single purchase.
    if (total !== null && amounts.includes(total)) score += 15;

    candidates.push({ text: withoutPrice, score });
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.score > a.score ? b : a)).text;
}

function extractBrand(productName: string | null, allText: string): string | null {
  const haystack = `${productName ?? ''} ${allText}`.toLowerCase();

  const known = KNOWN_BRANDS.find((brand) =>
    new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}\\b`, 'i').test(haystack)
  );
  if (known) return known;

  // Otherwise the first word of the product is the brand often enough to be
  // a useful prefill, and it is one tap to clear.
  const first = productName?.trim().split(/\s+/)[0];
  if (first && /^[A-Za-z][A-Za-z&.-]{1,}$/.test(first)) return first;

  return null;
}

// -------------------------------------------------------------------- entry --

export function extractPurchase(result: OcrResult): ReceiptExtraction {
  const lines = mergeRows(result.lines.filter((line) => line.text.trim().length > 0));
  const allText = result.text;

  const price = extractTotal(lines);
  const productName = extractProductName(lines, price);
  const currency = extractCurrency(allText);

  const candidate: Partial<PurchaseFormValues> = {
    product_name: productName ?? undefined,
    brand: extractBrand(productName, allText),
    price,
    currency: currency ?? undefined,
    purchase_date:
      extractDate(lines, MONTH_FIRST_CURRENCIES.has(currency ?? '')) ?? undefined,
    seller: extractSeller(lines),
    warranty_months: extractWarrantyMonths(lines),
    invoice_number: extractLabelled(
      lines,
      /\b(invoice|bill|receipt|order)\s*(no|number|#|id)?\b/i,
      IDENTIFIER
    ),
    serial_number: extractLabelled(
      lines,
      /\b(serial\s*(no|number)?|s\/n|sn|imei)\b/i,
      IDENTIFIER
    ),
  };

  // `filled` drives the review UI, so it must list only fields that actually
  // got a value — not ones that merely round-tripped as null.
  const filled = (Object.keys(candidate) as ExtractionField[]).filter((key) => {
    const value = candidate[key];
    return value !== null && value !== undefined && value !== '';
  });

  const values: Partial<PurchaseFormValues> = {};
  for (const key of filled) {
    Object.assign(values, { [key]: candidate[key] });
  }

  return { values, filled };
}
