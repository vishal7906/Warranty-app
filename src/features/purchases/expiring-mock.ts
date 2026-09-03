import type { PurchaseRow } from '@/lib/database.types';

export type ExpiringItem = Pick<
  PurchaseRow,
  'id' | 'product_name' | 'brand' | 'category' | 'purchase_date' | 'warranty_end'
>;

/**
 * Demo data for the expiring-soon carousel. The screen now feeds it real
 * purchases via `selectExpiringSoon`, so this is parked for previewing the
 * carousel without a signed-in account.
 */
// export const MOCK_EXPIRING_ITEMS: ExpiringItem[] = [
//   {
//     id: 'mock-1',
//     product_name: 'MacBook Pro 14"',
//     brand: 'Apple',
//     category: 'Electronics',
//     purchase_date: '2025-09-05',
//     warranty_end: '2026-09-05',
//   },
//   {
//     id: 'mock-2',
//     product_name: 'Cordless Drill Set',
//     brand: 'DeWalt',
//     category: 'Hardware',
//     purchase_date: '2025-09-08',
//     warranty_end: '2026-09-08',
//   },
//   {
//     id: 'mock-3',
//     product_name: 'Running Shoes',
//     brand: 'Nike',
//     category: 'Sport',
//     purchase_date: '2025-09-15',
//     warranty_end: '2026-09-15',
//   },
//   {
//     id: 'mock-4',
//     product_name: 'Stand Mixer',
//     brand: 'KitchenAid',
//     category: 'Home & Kitchen',
//     purchase_date: '2025-09-20',
//     warranty_end: '2026-09-20',
//   },
//   {
//     id: 'mock-5',
//     product_name: 'Dash Cam',
//     brand: 'Garmin',
//     category: 'Automotive',
//     purchase_date: '2025-09-28',
//     warranty_end: '2026-09-28',
//   },
// ];
