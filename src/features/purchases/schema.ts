import { z } from 'zod';

const trimmedOptional = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Not a valid date');

export const purchaseFormSchema = z.object({
  product_name: z.string().trim().min(1, 'Product name is required'),
  brand: trimmedOptional,
  category: trimmedOptional,
  price: z
    .number({ error: 'Price must be a number' })
    .nonnegative('Price cannot be negative')
    .nullable(),
  currency: z.string().trim().length(3, 'Use a 3-letter currency code').default('INR'),
  purchase_date: isoDate,
  seller: trimmedOptional,
  warranty_months: z
    .number()
    .int('Use whole months')
    .min(0, 'Cannot be negative')
    .max(600, 'That looks too long')
    .nullable(),
  invoice_number: trimmedOptional,
  serial_number: trimmedOptional,
  notes: trimmedOptional,
});

export type PurchaseFormValues = z.input<typeof purchaseFormSchema>;
export type PurchaseFormOutput = z.output<typeof purchaseFormSchema>;

export const emptyPurchaseForm = (today: string): PurchaseFormValues => ({
  product_name: '',
  brand: null,
  category: null,
  price: null,
  currency: 'INR',
  purchase_date: today,
  seller: null,
  warranty_months: 12,
  invoice_number: null,
  serial_number: null,
  notes: null,
});

/** Shape returned by the receipt-extraction AI in V2; kept here so the manual
 *  form and the OCR pipeline agree on one contract from the start. */
export const extractedReceiptSchema = purchaseFormSchema.partial().extend({
  productName: z.string().optional(),
});
