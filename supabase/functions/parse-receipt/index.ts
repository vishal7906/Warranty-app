/**
 * Reads a receipt image with Groq's vision model and returns structured
 * purchase fields as JSON.
 *
 * The Groq API key lives only in this function's environment (`supabase
 * secrets set GROQ_API_KEY=...`) — it never reaches the client bundle.
 * Supabase verifies the caller's JWT before this code runs (the project
 * default), so no auth check is done here.
 *
 * Groq's vision models don't accept PDFs, only images — this endpoint
 * rejects PDFs outright so the client can fall back to attaching the file
 * without a scan, same as before there was any AI extraction at all.
 */

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
// Groq's only vision-capable model as of writing; JSON mode works alongside
// image input on this one, unlike the strict-schema models.
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'qwen/qwen3.6-27b';

// Base64 inflates raw bytes by ~4/3, so this comfortably covers the app's
// 10 MB upload cap while staying under Groq's 20 MB per-request limit.
const MAX_BASE64_LENGTH = 14_000_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The price rule below exists because of a real failure: on an Indian-format
// total like "1,34,900.00", naive regex parsing over OCR text picked the last
// comma-group ("900") instead of the whole number. Spelling the rule out for
// the model, with that exact example, is what keeps it from repeating that.
const PROMPT = `You are reading a purchase receipt or invoice image for a warranty-tracking app. Read it carefully and respond with ONLY a JSON object (no other text) with exactly these keys: product_name, brand, price, currency, purchase_date, seller, warranty_months, invoice_number, serial_number.

Rules:
- price: the final grand total actually paid, as a plain JSON number — no currency symbols, no thousands separators. A total printed as "1,34,900.00" (Indian lakh grouping) must become 134900.00, not 900 or 134.9. If several amounts appear (subtotal, tax, grand total), use the final grand total.
- currency: the ISO 4217 3-letter code (e.g. INR, USD). If no explicit currency is printed but the document mentions GST, CGST, SGST, IGST, HSN, or Rs./₹, use INR.
- purchase_date: the purchase or invoice date, formatted as YYYY-MM-DD.
- warranty_months: only if a warranty period is explicitly printed on the document, converted to whole months (e.g. "1 year" -> 12, "24 months" -> 24). Use null if no warranty period is stated — never guess a default.
- product_name: the main product or item purchased, not the store name.
- brand: the manufacturer/brand of the product, if identifiable separately from the product name. Otherwise null.
- seller: the name of the store or company that issued the receipt.
- invoice_number / serial_number: exactly as printed, otherwise null.

Use null (JSON null, not a string) for any field not supported by the document. Never fabricate a value — use null instead of guessing. Respond with the JSON object only.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  if (!GROQ_API_KEY) {
    return json({ error: 'Receipt scanning is not configured on the server.' }, 500);
  }

  let body: { fileBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const { fileBase64, mimeType } = body;
  if (!fileBase64 || !mimeType) {
    return json({ error: 'A file and its mime type are required.' }, 400);
  }
  if (!mimeType.startsWith('image/')) {
    return json({ error: 'Only images can be scanned.' }, 400);
  }
  if (fileBase64.length > MAX_BASE64_LENGTH) {
    return json({ error: 'That file is too large to scan.' }, 400);
  }

  const groqRequest = {
    model: GROQ_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
        ],
      },
    ],
  };

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(groqRequest),
  });

  if (!groqResponse.ok) {
    console.error('Groq request failed', groqResponse.status, await groqResponse.text());
    return json({ error: 'The receipt could not be read.' }, 502);
  }

  const result = await groqResponse.json();
  const text = result.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    console.error('Groq response had no content', JSON.stringify(result).slice(0, 500));
    return json({ error: 'The receipt could not be read.' }, 502);
  }

  let fields: unknown;
  try {
    fields = JSON.parse(text);
  } catch {
    return json({ error: 'The receipt could not be read.' }, 502);
  }

  return json({ fields });
});
