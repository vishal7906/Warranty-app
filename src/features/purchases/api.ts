import { supabase } from '@/lib/supabase';
import type { PurchaseRow } from '@/lib/database.types';
import type { PurchaseFormOutput } from '@/features/purchases/schema';
import { computeWarrantyEnd } from '@/features/purchases/warranty';

function toRow(values: PurchaseFormOutput) {
  return {
    ...values,
    warranty_start: values.warranty_months ? values.purchase_date : null,
    warranty_end: computeWarrantyEnd(values.purchase_date, values.warranty_months),
  };
}

export async function listPurchases(): Promise<PurchaseRow[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('warranty_end', { ascending: true, nullsFirst: false })
    .order('purchase_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPurchase(id: string): Promise<PurchaseRow> {
  const { data, error } = await supabase.from('purchases').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

export async function createPurchase(values: PurchaseFormOutput): Promise<PurchaseRow> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('You need to be signed in to save a purchase.');

  const { data, error } = await supabase
    .from('purchases')
    .insert({ ...toRow(values), user_id: auth.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePurchase(
  id: string,
  values: PurchaseFormOutput
): Promise<PurchaseRow> {
  const { data, error } = await supabase
    .from('purchases')
    .update(toRow(values))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase.from('purchases').delete().eq('id', id);
  if (error) throw error;
}
