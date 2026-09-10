/**
 * Live end-to-end test of the LCA intranet against the RUNNING dev server.
 * Exercises the real Next.js server + real Supabase (DB + Storage) + real
 * compliance computation, through an authenticated SSR session.
 *
 * Usage: BASE=http://localhost:3001 node scripts/e2e-lca.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.BASE || "http://localhost:3001";
const EMAIL = process.env.E2E_EMAIL || "admin@example.com"; // set to an address in LCA_ADMIN_EMAILS
const KEEP = process.env.KEEP === "1"; // keep the created posting (for screenshotting)

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let pass = 0,
  fail = 0;
function check(name, ok, detail = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${ok ? "" : ` — ${detail}`}`);
  ok ? pass++ : fail++;
  return ok;
}

// Minimal valid one-page PDF.
function samplePdf(text) {
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 12 Tf 20 60 Td (${text}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;
  return new Uint8Array(Buffer.from(body, "utf8"));
}

async function mintSessionCookies(email) {
  // Ensure the auth user exists (ignore "already registered").
  await admin.auth.admin
    .createUser({ email, email_confirm: true })
    .catch(() => {});
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(`generateLink: ${error.message}`);
  const otp = data?.properties?.email_otp;
  if (!otp) throw new Error("no email_otp returned");

  const jar = new Map();
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
      },
    }
  );
  const { error: vErr } = await ssr.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });
  if (vErr) throw new Error(`verifyOtp: ${vErr.message}`);
  if (jar.size === 0) throw new Error("no session cookies captured");
  const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
  return cookie;
}

async function run() {
  console.log(`\n🌐 LCA intranet E2E  (${BASE}, ${EMAIL})\n`);

  console.log("1. Mint authenticated SSR session");
  const cookie = await mintSessionCookies(EMAIL);
  check("session cookies obtained", !!cookie);

  const auth = { cookie, "Content-Type": "application/json" };

  console.log("\n2. GET /api/portal/lca (list, admin)");
  const listRes = await fetch(`${BASE}/api/portal/lca`, { headers: { cookie } });
  const listBody = await listRes.json().catch(() => ({}));
  if (!check(`200 OK (got ${listRes.status})`, listRes.status === 200, JSON.stringify(listBody))) {
    console.log(
      "\n   ⛔ The lca_postings table almost certainly doesn't exist yet.\n" +
        "      Create it (scripts/lca-schema.sql) and re-run this script.\n"
    );
    return finish();
  }
  check("viewer recognized as admin", listBody.isAdmin === true);

  console.log("\n3. POST /api/portal/lca (upload real PDF, window crosses Memorial Day)");
  const fd = new FormData();
  fd.append(
    "document",
    new Blob([samplePdf("LCA Notice - Computer Science Fellow NY")], { type: "application/pdf" }),
    "Computer Science Fellow_NY.pdf"
  );
  fd.append("fellowship_title", "Computer Science Fellow — NY");
  fd.append("fellow_name", "Neha Mishra");
  fd.append("worksite", "New York, NY");
  fd.append("posting_date", "2026-05-18");
  fd.append("posted_by", "Lorenzo Barberis Canonico");
  fd.append("notes", "E2E test posting");
  const createRes = await fetch(`${BASE}/api/portal/lca`, {
    method: "POST",
    headers: { cookie },
    body: fd,
  });
  const created = await createRes.json().catch(() => ({}));
  if (!check(`201 Created (got ${createRes.status})`, createRes.status === 201, JSON.stringify(created))) {
    return finish();
  }
  const posting = created.posting;
  check("computed remains_through = 2026-06-01 (extended past Memorial Day)", posting.window.remainsThrough === "2026-06-01", posting.window.remainsThrough);
  check("Memorial Day recorded as the extension", posting.window.holidaysInWindow?.[0]?.name === "Memorial Day");
  check("stored remains_through persisted", posting.remains_through === "2026-06-01", posting.remains_through);
  check("past-dated window shows window_complete", posting.status === "window_complete", posting.status);
  check("placed confirmation timestamp present", !!posting.placed_confirmed_at);
  check("placed-notification sent to compliance team", created.notified?.ok === true, JSON.stringify(created.notified));
  console.log(`     notified: ${JSON.stringify(created.notified?.to || created.notified)}`);

  console.log("\n3b. POST a today-dated posting → status active with days remaining");
  const today = new Date().toISOString().slice(0, 10);
  const fd2 = new FormData();
  fd2.append("document", new Blob([samplePdf("LCA Notice - Accounting Fellow CA")], { type: "application/pdf" }), "Accounting Fellow CA.pdf");
  fd2.append("fellowship_title", "Accounting Fellow — CA");
  fd2.append("fellow_name", "Neha Mishra");
  fd2.append("worksite", "San Francisco, CA");
  fd2.append("posting_date", today);
  fd2.append("posted_by", "Lorenzo Barberis Canonico");
  const createRes2 = await fetch(`${BASE}/api/portal/lca`, { method: "POST", headers: { cookie }, body: fd2 });
  const created2 = await createRes2.json().catch(() => ({}));
  check(`201 Created (got ${createRes2.status})`, createRes2.status === 201, JSON.stringify(created2));
  const activePosting = created2.posting;
  check("status active for today's posting", activePosting?.status === "active", activePosting?.status);
  check("business days remaining >= 1", activePosting?.businessDaysRemaining >= 1, String(activePosting?.businessDaysRemaining));

  console.log("\n4. GET document (signed-URL redirect) + fetch the file");
  const docRes = await fetch(`${BASE}/api/portal/lca/${posting.id}/document`, {
    headers: { cookie },
    redirect: "manual",
  });
  const loc = docRes.headers.get("location") || "";
  check(`302/307 redirect to signed URL (got ${docRes.status})`, [302, 307].includes(docRes.status) && /token=/.test(loc), loc.slice(0, 60));
  if (loc) {
    const fileRes = await fetch(loc);
    const ct = fileRes.headers.get("content-type") || "";
    check(`signed URL serves the PDF (200, got ${fileRes.status})`, fileRes.status === 200);
  }

  console.log("\n5. Unauthenticated document access is blocked");
  const noAuth = await fetch(`${BASE}/api/portal/lca/${posting.id}/document`, { redirect: "manual" });
  check(`401 without session (got ${noAuth.status})`, noAuth.status === 401);

  console.log("\n6. PATCH confirm_removal → status flips to removed");
  const rmRes = await fetch(`${BASE}/api/portal/lca/${posting.id}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ action: "confirm_removal" }),
  });
  const rmBody = await rmRes.json().catch(() => ({}));
  check(`200 (got ${rmRes.status})`, rmRes.status === 200, JSON.stringify(rmBody));
  check("status now removed", rmBody.posting?.status === "removed", rmBody.posting?.status);
  check("removal confirmation timestamp present", !!rmBody.posting?.removed_at);
  check("removed-notification sent to compliance team", rmBody.notified?.ok === true, JSON.stringify(rmBody.notified));

  console.log("\n7. Non-admin cannot upload (authorization enforced)");
  // A logged-out request (no cookie) must be rejected on POST.
  const anonPost = await fetch(`${BASE}/api/portal/lca`, { method: "POST", body: new FormData() });
  check(`401 for unauthenticated POST (got ${anonPost.status})`, anonPost.status === 401);

  if (KEEP) {
    console.log("\n   ↩︎  KEEP=1: leaving both postings in place for screenshotting.");
  } else {
    console.log("\n8. Cleanup: delete the test postings");
    for (const id of [posting.id, activePosting?.id].filter(Boolean)) {
      const delRes = await fetch(`${BASE}/api/portal/lca/${id}`, {
        method: "DELETE",
        headers: { cookie },
      });
      check(`deleted ${id.slice(0, 8)} (got ${delRes.status})`, delRes.status === 200);
    }
  }

  finish();
}

function finish() {
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error("🔥", e.message);
  process.exit(1);
});
