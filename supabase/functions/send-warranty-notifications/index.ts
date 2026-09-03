/**
 * Sends one FCM data-only push per purchase whose warranty has 0-29 days
 * left, once per calendar day. Triggered by a Supabase pg_cron job (see
 * supabase/cron-setup.sql), not by the client — there's no user JWT on that
 * call, so this function is deployed with `--no-verify-jwt` and checks a
 * shared secret instead (`supabase secrets set CRON_SECRET=...`).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

type ReminderInsert = {
  purchase_id: string;
  user_id: string;
  reminder_date: string;
  reminder_type: string;
  is_sent: boolean;
};

const CRON_SECRET = Deno.env.get('CRON_SECRET');
const EXPIRING_SOON_DAYS = 30;
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = toISODate(new Date());
  const cutoff = toISODate(new Date(Date.now() + EXPIRING_SOON_DAYS * 86_400_000));

  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('id, user_id, product_name, warranty_end')
    .not('warranty_end', 'is', null)
    .gte('warranty_end', today)
    .lt('warranty_end', cutoff);
  if (purchasesError) return new Response(purchasesError.message, { status: 500 });
  if (!purchases?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const { data: alreadySent } = await supabase
    .from('reminders')
    .select('purchase_id')
    .eq('reminder_date', today)
    .eq('reminder_type', 'warranty_expiry')
    .in(
      'purchase_id',
      purchases.map((p) => p.id)
    );
  const sentIds = new Set((alreadySent ?? []).map((r) => r.purchase_id));
  const due = purchases.filter((p) => !sentIds.has(p.id));
  if (!due.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const userIds = [...new Set(due.map((p) => p.user_id))];
  const { data: tokenRows } = await supabase
    .from('device_push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    tokensByUser.set(row.user_id, [...(tokensByUser.get(row.user_id) ?? []), row.token]);
  }

  const messages: Record<string, unknown>[] = [];
  const remindersToInsert: ReminderInsert[] = [];

  for (const purchase of due) {
    const tokens = tokensByUser.get(purchase.user_id) ?? [];
    if (!tokens.length) continue; // no device registered yet; picked up again on a later day still within the window

    const daysRemaining = Math.round(
      (new Date(purchase.warranty_end as string).getTime() - Date.now()) / 86_400_000
    );
    const body = `Your ${purchase.product_name} warranty expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

    for (const token of tokens) {
      messages.push({
        to: token,
        data: {
          type: 'warranty_expiring',
          purchaseId: purchase.id,
          productName: purchase.product_name,
          daysRemaining,
          title: 'Warranty expiring soon',
          body,
        },
        priority: 'high',
        channelId: 'default',
        _contentAvailable: true,
      });
    }

    remindersToInsert.push({
      purchase_id: purchase.id,
      user_id: purchase.user_id,
      reminder_date: today,
      reminder_type: 'warranty_expiry',
      is_sent: true,
    });
  }

  for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) console.error('Expo push send failed', res.status, await res.text());
  }

  if (remindersToInsert.length) {
    const { error: insertError } = await supabase
      .from('reminders')
      .upsert(remindersToInsert, {
        onConflict: 'purchase_id,reminder_date,reminder_type',
        ignoreDuplicates: true,
      });
    if (insertError) console.error('Failed to record reminders', insertError.message);
  }

  return new Response(
    JSON.stringify({ sent: messages.length, purchases: remindersToInsert.length }),
    { status: 200 }
  );
});
