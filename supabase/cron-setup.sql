-- Daily warranty-expiry push notification schedule.
--
-- Run manually, once, in the Supabase SQL editor (Database → SQL Editor).
-- Kept separate from schema.sql: this embeds a project-specific function URL
-- and a secret, and `cron.schedule`/`vault.create_secret` aren't safely
-- re-runnable the way schema.sql's `if not exists` statements are.
--
-- Before running, replace:
--   <PROJECT_REF>   — your Supabase project ref (from Project Settings → General)
--   <CRON_SECRET>   — a random value, e.g. generated with `openssl rand -hex 32`.
--                     Use the SAME value here and for the edge function's env:
--                       supabase secrets set CRON_SECRET=<CRON_SECRET>
--                     These are two independent stores; nothing syncs them
--                     automatically, so a mismatch here means every cron
--                     invocation gets a 401 from the function.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  '<CRON_SECRET>',
  'cron_secret',
  'Shared secret checked by send-warranty-notifications'
);

-- Re-running this schedule (e.g. to change the time) requires unscheduling
-- the old job first, since cron.schedule errors on a duplicate job name:
--   select cron.unschedule('send-warranty-notifications-daily');

select cron.schedule(
  'send-warranty-notifications-daily',
  '0 9 * * *', -- 09:00 UTC daily — pg_cron runs in UTC; adjust for your users' timezone
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-warranty-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verification:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
