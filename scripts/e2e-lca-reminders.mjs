/**
 * Live E2E for the "ready to remove" reminder against the RUNNING server.
 * Uses the cron route's asOf override to test deterministically regardless of
 * the system clock. Usage: BASE=http://localhost:3001 node scripts/e2e-lca-reminders.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { computeWindow } from "../src/lib/lcaCompliance.mjs";

const BASE = process.env.BASE || "http://localhost:3001";
const EMAIL = process.env.E2E_EMAIL || "admin@example.com"; // set to an address in LCA_ADMIN_EMAILS
const SECRET = process.env.CRON_SECRET;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`  ${ok ? "✅" : "❌"} ${n}${ok ? "" : ` — ${d}`}`); ok ? pass++ : fail++; };

function samplePdf(t) {
  return new Uint8Array(Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R>>endobj\n4 0 obj<</Length 40>>stream\nBT /F1 12 Tf 20 50 Td (${t}) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`, "utf8"));
}

async function mintCookie(email) {
  await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const jar = new Map();
  const ssr = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) },
  });
  await ssr.auth.verifyOtp({ email, token: data.properties.email_otp, type: "email" });
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

async function cron(params) {
  const res = await fetch(`${BASE}/api/cron/lca-reminders?${params}`, {
    method: "POST",
    headers: { authorization: `Bearer ${SECRET}` },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function run() {
  console.log(`\n🔔 LCA ready-to-remove reminder E2E (${BASE})\n`);
  if (!SECRET) return check("CRON_SECRET present", false, "not set in .env.local"), finish();

  const cookie = await mintCookie(EMAIL);

  // A past posting whose window is already complete.
  const postingDate = "2026-05-18";
  const win = computeWindow(postingDate);
  console.log(`   posting ${postingDate} → remainsThrough ${win.remainsThrough}, earliestRemoval ${win.earliestRemoval}`);

  console.log("1. Create a completed-window posting");
  const fd = new FormData();
  fd.append("document", new Blob([samplePdf("LCA ready test")], { type: "application/pdf" }), "ReadyTest.pdf");
  fd.append("fellowship_title", "Reminder Test Fellow — NY");
  fd.append("posting_date", postingDate);
  fd.append("posted_by", "Lorenzo Barberis Canonico");
  const cRes = await fetch(`${BASE}/api/portal/lca`, { method: "POST", headers: { cookie }, body: fd });
  const created = await cRes.json().catch(() => ({}));
  check(`created (got ${cRes.status})`, cRes.status === 201, JSON.stringify(created));
  const id = created.posting?.id;

  console.log("2. Cron is guarded (401 without secret)");
  const noAuth = await fetch(`${BASE}/api/cron/lca-reminders`, { method: "POST" });
  check(`401 without secret (got ${noAuth.status})`, noAuth.status === 401);

  console.log(`3. Cron on the removable day (asOf=${win.earliestRemoval}) → sends`);
  const due = await cron(`asOf=${win.earliestRemoval}`);
  check(`200 (got ${due.status})`, due.status === 200, JSON.stringify(due.body));
  check("reminder sent for our posting", (due.body.results || []).some((r) => r.id === id && r.ok), JSON.stringify(due.body.results));
  check("summary sent >= 1", due.body.sent >= 1, String(due.body.sent));

  console.log(`4. Cron on a different day (asOf=${win.remainsThrough}) → does NOT send for it`);
  const notDue = await cron(`asOf=${win.remainsThrough}`);
  check("our posting not due on a non-removable day", !(notDue.body.results || []).some((r) => r.id === id), JSON.stringify(notDue.body.results));

  console.log("5. Cleanup");
  const del = await fetch(`${BASE}/api/portal/lca/${id}`, { method: "DELETE", headers: { cookie } });
  check(`deleted (got ${del.status})`, del.status === 200);

  finish();
}

function finish() {
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
run().catch((e) => { console.error("🔥", e.message); process.exit(1); });
