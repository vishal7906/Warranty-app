# Warranty Manager

> Never lose a receipt or forget a warranty again.

A React Native + Expo app for tracking purchases, receipts, and warranty expiry.
This repository currently contains **Phase 1**: auth, the database layer, manual
purchase entry, the purchase list and detail screens, and warranty date maths.

## Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| App        | Expo SDK 57, Expo Router, TypeScript                |
| State      | Zustand (UI state), TanStack Query (server state)   |
| Validation | Zod                                                 |
| Backend    | Supabase (Postgres + Auth + Storage)                |

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Run the schema.** Open Database → SQL Editor and run
   [`supabase/schema.sql`](supabase/schema.sql). It creates `profiles`,
   `purchases`, `receipts`, and `reminders`, enables row level security so each
   user only ever sees their own rows, and creates the private `receipts`
   storage bucket used from V2 onward.

3. **Add credentials.** Copy the example env file and fill it in from
   Project Settings → API:

   ```bash
   cp .env.example .env
   ```

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   Only the **anon** key belongs here — `EXPO_PUBLIC_*` values are inlined into
   the client bundle. Without these the app renders a setup screen instead of
   crashing.

4. **Point auth emails back at the app.** Under Authentication → URL
   Configuration, set **Site URL** to `warrantyapp://` and add these to
   **Redirect URLs**:

   ```
   warrantyapp://*
   exp://*        # Expo Go, whose dev-server URL changes per machine
   ```

   Supabase otherwise defaults to `http://localhost:3000`, and confirmation
   links dead-end on a page that isn't running. The app picks the session out
   of the returned URL fragment in
   [`auth-provider.tsx`](src/providers/auth-provider.tsx).

   While building solo you can skip confirmation entirely: Authentication →
   Sign In / Providers → Email → turn off **Confirm email**.

5. **Enable Google sign-in** (optional). In the Google Cloud console create an
   OAuth 2.0 client of type **Web application** and add this authorized
   redirect URI:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   Then in Supabase → Authentication → Providers → Google, enable the provider
   and paste the client ID and secret. The app opens that flow in a system
   browser via `expo-web-browser` and reads the session out of the redirect, so
   it needs no native module and works in Expo Go.

6. **Run it.**

   ```bash
   npm install
   npx expo start
   ```

   Everything in Phase 1 works in Expo Go. A development build is only needed
   from Phase 3, when the on-device OCR native module arrives.

## Project layout

```
src/
  app/                          Routes only — no components or utils in here
    _layout.tsx                 Providers + auth-guarded root stack
    sign-in.tsx / sign-up.tsx
    new-purchase.tsx            Modal: scan / upload / manual entry
    (tabs)/
      _layout.tsx               Native bottom tabs
      (index,settings)/         Shared stack for both tabs
        _layout.tsx
        index.tsx               Warranties grouped by expiry urgency
        settings.tsx
        purchase/[id].tsx
  components/                   Presentational pieces
  features/purchases/
    api.ts                      Supabase reads and writes
    queries.ts                  TanStack Query hooks + cache keys
    schema.ts                   Zod form contract (shared with V2 OCR output)
    warranty.ts                 Status buckets and date maths
    format.ts                   Money, date, and duration formatting
  lib/
    env.ts                      EXPO_PUBLIC config + configured check
    supabase.ts                 Typed client, AsyncStorage session, autorefresh
    database.types.ts           Mirror of supabase/schema.sql
  providers/                    Auth and React Query providers
  store/                        Zustand stores
supabase/schema.sql
```

## Warranty statuses

`warranty_end` is derived from `purchase_date + warranty_months` on save, and
each purchase is bucketed by days remaining:

| Bucket        | Days remaining |
| ------------- | -------------- |
| Expiring Soon | 0 – 30         |
| Upcoming      | 31 – 120       |
| Active        | > 120          |
| Expired       | < 0            |

Thresholds live in [`src/features/purchases/warranty.ts`](src/features/purchases/warranty.ts).

## Scripts

```bash
npm start          # Expo dev server
npm run ios        # Dev server, open iOS simulator
npm run android    # Dev server, open Android emulator
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Roadmap

- **V1 (here)** — auth (password + Google), manual entry, list, detail,
  warranty dates
- **V2** — VisionCamera capture, on-device OCR (Apple Vision / ML Kit), LLM
  extraction into the `purchaseFormSchema` contract, user confirmation
- **V3** — natural-language search, warranty claim assistant, analytics
- **V4** — sync, export, sharing, tiers
# Warranty-app
