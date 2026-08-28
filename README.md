# Warranty Manager

> Never lose a receipt or forget a warranty again.

A React Native + Expo app for tracking purchases, receipts, and warranty expiry.
Point your camera at a receipt and the purchase fills itself in. Text is read
**on device** — the image never leaves the phone to be understood — and the
extracted fields are shown for you to check before anything is saved.

This repository contains auth, the database layer, the purchase list and detail
screens, warranty date maths, receipt upload backed by private Supabase
Storage, and on-device receipt scanning with field extraction.

## Stack

| Layer      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| App        | Expo SDK 57, Expo Router, TypeScript                     |
| State      | Zustand (UI state), TanStack Query (server state)        |
| Validation | Zod                                                      |
| Backend    | Supabase (Postgres + Auth + Storage)                     |
| OCR        | Local Expo module: Apple Vision (iOS), ML Kit (Android)  |

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Run the schema.** Open Database → SQL Editor and run
   [`supabase/schema.sql`](supabase/schema.sql). It creates `profiles`,
   `purchases`, `receipts`, and `reminders`, enables row level security so each
   user only ever sees their own rows, and creates the private `receipts`
   storage bucket that receipt uploads write into.

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

   **Expo Go is no longer enough.** Receipt scanning is a local native module
   ([`modules/receipt-ocr`](modules/receipt-ocr)), so it has to be compiled
   into the app:

   ```bash
   npx expo run:ios       # or: npx expo run:android
   ```

   The app still *runs* in Expo Go — scanning degrades to manual entry with a
   message rather than crashing — but nothing will be extracted there.

## Project layout

```
src/
  app/                          Routes only — no components or utils in here
    _layout.tsx                 Providers + auth-guarded root stack
    sign-in.tsx / sign-up.tsx
    new-purchase.tsx            Modal: scan / upload / manual entry
    receipt/[id].tsx            Modal: full-screen receipt viewer
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
  features/receipts/
    pick.ts                     Camera / library / document pickers, one shape
    api.ts                      Storage upload, signed URLs, cleanup
    queries.ts                  TanStack Query hooks + cache keys
    scan.ts                     Runs OCR, degrades to manual on any failure
    extract.ts                  OCR text -> purchase fields (pure, testable)
modules/receipt-ocr/            Local Expo module: Vision (iOS), ML Kit (Android)
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

## Scanning a receipt

Scan or Upload on the Add Purchase screen runs the image through the platform's
on-device text recognizer, then parses the result into form fields. The user
lands on a pre-filled form with every guessed field marked, and nothing is saved
until they confirm.

```
pick / capture  ──▶  modules/receipt-ocr   ──▶  extract.ts    ──▶  pre-filled form
                     Vision  |  ML Kit          heuristics         user confirms
                     (on device, offline)       (pure TS)          then saves
```

The split is deliberate: the native side only returns positioned lines of text,
and **every interpretation lives in [`extract.ts`](src/features/receipts/extract.ts)**
as a pure function of `OcrResult`. Parsing rules can therefore be changed and
tested without rebuilding the native module.

### What it pulls out

| Field           | How it is found                                                        |
| --------------- | ---------------------------------------------------------------------- |
| Product         | The line carrying a price, weighted toward the middle of the receipt    |
| Brand           | A known brand anywhere in the text, else the product's first word       |
| Price           | Labelled total (`grand total`, `amount payable`, …), else largest amount |
| Currency        | Symbol or code; a GST breakdown implies INR                            |
| Purchase date   | Labelled date preferred; ties broken by currency (USD reads month-first) |
| Seller          | Top-of-receipt line that is a name, not an address or a tax id          |
| Warranty        | `warranty` / `protection plan` / `AMC` plus a duration, in years or months |
| Invoice, serial | Labelled value; must contain a digit, so a label is never returned      |

### Known limits

- **Heuristics, not comprehension.** Unusual layouts will mis-assign fields.
  This is why every extracted value is shown as a checkable guess rather than
  saved silently.
- **`12/03` is ambiguous** and no receipt says which order it used. Day-first
  wins unless the currency is USD.
- **PDFs are not scanned** — neither Vision nor ML Kit rasterizes one. A PDF
  attaches to the purchase, and the form stays manual.
- **Latin scripts only**, per the bundled ML Kit model.

## Receipts

A receipt is an image or a PDF attached to a purchase. It can be added while
creating the purchase (Scan or Upload on the Add Purchase screen) or afterwards
from the purchase detail screen.

Files live in the **private** `receipts` bucket under
`<user_id>/<purchase_id>/<unique>.<ext>`. That first path segment is not
cosmetic — the bucket's RLS policy compares it to `auth.uid()`, so the layout
and [`supabase/schema.sql`](supabase/schema.sql) have to change together.
Because the bucket is private, viewing a receipt goes through a signed URL that
expires after an hour rather than a stable public path.

| Rule            | Value                                          |
| --------------- | ---------------------------------------------- |
| Accepted types  | any `image/*`, plus `application/pdf`           |
| Size limit      | 10 MB                                           |
| Camera quality  | 0.7 (legibility over fidelity, smaller uploads) |

Two cleanup paths are worth knowing about, both in
[`src/features/receipts/api.ts`](src/features/receipts/api.ts):

- A failed row insert after a successful upload removes the orphaned object, so
  storage never accumulates files nothing points at.
- Deleting a purchase cascades to its `receipts` rows in Postgres, but storage
  is outside Postgres — so `deletePurchase` removes the objects first.

## Scripts

```bash
npm start          # Expo dev server (JS only — no scanning)
npm run ios        # Build the native app and run it on the iOS simulator
npm run android    # Build the native app and run it on an Android emulator
npm run web        # Dev server for web (no scanning)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Roadmap

- **V1 (here)** — auth (password + Google), manual entry, list, detail,
  warranty dates, receipt upload and viewing
- **V2 (here)** — on-device OCR (Apple Vision / ML Kit), field extraction into
  the `purchaseFormSchema` contract, user confirmation before saving
- **V3** — natural-language search, warranty claim assistant, analytics
- **V4** — sync, export, sharing, tiers
# Warranty-app
