/**
 * Hand-written mirror of `supabase/schema.sql`. Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type PurchaseRow = {
  id: string;
  user_id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  purchase_date: string;
  seller: string | null;
  warranty_months: number | null;
  warranty_start: string | null;
  warranty_end: string | null;
  invoice_number: string | null;
  serial_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseInsert = Omit<PurchaseRow, 'id' | 'created_at' | 'updated_at'>;
export type PurchaseUpdate = Partial<Omit<PurchaseRow, 'id' | 'user_id' | 'created_at'>>;

export type ReceiptRow = {
  id: string;
  purchase_id: string;
  user_id: string;
  file_path: string;
  file_type: string | null;
  created_at: string;
};

export type ReminderRow = {
  id: string;
  purchase_id: string;
  user_id: string;
  reminder_date: string;
  reminder_type: string;
  is_sent: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      purchases: {
        Row: PurchaseRow;
        Insert: PurchaseInsert;
        Update: PurchaseUpdate;
        Relationships: [];
      };
      receipts: {
        Row: ReceiptRow;
        Insert: Omit<ReceiptRow, 'id' | 'created_at'>;
        Update: Partial<ReceiptRow>;
        Relationships: [];
      };
      reminders: {
        Row: ReminderRow;
        Insert: Omit<ReminderRow, 'id' | 'created_at'>;
        Update: Partial<ReminderRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
