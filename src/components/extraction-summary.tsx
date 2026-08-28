import { Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import type { ExtractionField } from '@/features/receipts/extract';
import type { ScanOutcome } from '@/features/receipts/scan';
import { useTheme } from '@/hooks/use-theme';

const FIELD_LABELS: Record<ExtractionField, string> = {
  product_name: 'product',
  brand: 'brand',
  price: 'price',
  currency: 'currency',
  purchase_date: 'date',
  seller: 'seller',
  warranty_months: 'warranty',
  invoice_number: 'invoice no.',
  serial_number: 'serial no.',
};

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Reports what the scan managed to read. Extraction is a set of heuristics over
 * OCR text and gets things wrong, so this is deliberately explicit about the
 * values being guesses the user is expected to check.
 */
export function ExtractionSummary({ outcome }: { outcome: ScanOutcome | null }) {
  const colors = useTheme();
  if (!outcome) return null;

  const { title, body, tone } = describe(outcome);

  return (
    <View
      style={{
        gap: Spacing.one,
        padding: Spacing.three,
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.card,
        borderCurve: 'continuous',
        borderLeftWidth: 3,
        borderLeftColor: tone === 'success' ? colors.success : colors.warning,
      }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 19 }}>{body}</Text>
    </View>
  );
}

function describe(outcome: ScanOutcome): {
  title: string;
  body: string;
  tone: 'success' | 'warning';
} {
  if (outcome.status === 'extracted') {
    const fields = outcome.extraction.filled.map((field) => FIELD_LABELS[field]);
    return {
      title: `Filled in ${fields.length} ${fields.length === 1 ? 'field' : 'fields'}`,
      body: `Read ${joinWithAnd(fields)} off your receipt. Check them before saving — anything wrong can be edited below.`,
      tone: 'success',
    };
  }

  if (outcome.status === 'nothing-found') {
    return {
      title: 'Nothing readable found',
      body: 'The text could not be made out — a flatter, brighter photo usually scans better. Fill in the details below; your receipt is still attached.',
      tone: 'warning',
    };
  }

  return { title: 'Could not scan this receipt', body: outcome.reason, tone: 'warning' };
}
