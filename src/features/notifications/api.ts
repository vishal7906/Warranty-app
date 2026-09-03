import { supabase } from '@/lib/supabase';

/** Registers (or reassigns, if the device previously belonged to another account) this device's push token to the signed-in user. */
export async function upsertPushToken(token: string, platform: string): Promise<void> {
  const { error } = await supabase.rpc('upsert_push_token', { p_token: token, p_platform: platform });
  if (error) throw error;
}

/** Removes this device's push token, e.g. on sign-out so a shared device stops notifying the previous account. */
export async function deletePushToken(token: string): Promise<void> {
  const { error } = await supabase.from('device_push_tokens').delete().eq('token', token);
  if (error) throw error;
}
