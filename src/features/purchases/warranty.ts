import { differenceInCalendarDays, addMonths, format, parseISO } from 'date-fns';

import type { PurchaseRow } from '@/lib/database.types';

export type WarrantyStatus = 'expired' | 'expiring' | 'upcoming' | 'active' | 'none';

/** Days remaining at or below which a warranty counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;
/** Days remaining at or below which a warranty counts as "upcoming". */
export const UPCOMING_DAYS = 120;

export type WarrantyInfo = {
  status: WarrantyStatus;
  /** Negative once the warranty has lapsed. `null` when there is no warranty. */
  daysRemaining: number | null;
  endDate: Date | null;
};

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Derives the warranty end date from a purchase date and a duration in months. */
export function computeWarrantyEnd(
  purchaseDate: string,
  warrantyMonths: number | null | undefined
): string | null {
  if (!warrantyMonths || warrantyMonths <= 0) return null;
  return toISODate(addMonths(parseISO(purchaseDate), warrantyMonths));
}

export function getWarrantyInfo(
  purchase: Pick<PurchaseRow, 'warranty_end'>,
  now: Date = new Date()
): WarrantyInfo {
  if (!purchase.warranty_end) {
    return { status: 'none', daysRemaining: null, endDate: null };
  }

  const endDate = parseISO(purchase.warranty_end);
  const daysRemaining = differenceInCalendarDays(endDate, now);

  let status: WarrantyStatus;
  if (daysRemaining < 0) status = 'expired';
  else if (daysRemaining <= EXPIRING_SOON_DAYS) status = 'expiring';
  else if (daysRemaining <= UPCOMING_DAYS) status = 'upcoming';
  else status = 'active';

  return { status, daysRemaining, endDate };
}

export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  expired: 'Expired',
  expiring: 'Expiring Soon',
  upcoming: 'Upcoming',
  active: 'Active',
  none: 'No Warranty',
};

/** Ordered as the home screen renders them. */
export const WARRANTY_SECTION_ORDER: WarrantyStatus[] = [
  'expiring',
  'upcoming',
  'active',
  'none',
  'expired',
];

export function describeRemaining(info: WarrantyInfo): string {
  if (info.status === 'none' || info.daysRemaining === null) return 'No warranty recorded';
  if (info.daysRemaining < 0) return `Expired ${Math.abs(info.daysRemaining)} days ago`;
  if (info.daysRemaining === 0) return 'Expires today';
  if (info.daysRemaining === 1) return 'Expires tomorrow';
  return `Expires in ${info.daysRemaining} days`;
}
