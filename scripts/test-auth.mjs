/**
 * Auth integration test script.
 * Requires dev server running on localhost:3000.
 *
 * Usage:
 *   npm run dev          # terminal 1
 *   node scripts/test-auth.mjs   # terminal 2
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const TEST_EMAIL = `test-${Date.now()}@example.com`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

let passed = 0;
let failed = 0;
let testUserId = null;

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name} — ${detail}`);
    failed++;
  }
}

async function cleanup() {
  if (testUserId) {
    await supabase.auth.admin.deleteUser(testUserId);
    console.log(`\n🧹 Cleaned up test user ${TEST_EMAIL}`);
  }
}

async function run() {
  console.log(`\n🔑 Auth Integration Tests (${BASE})\n`);

  // ── Test 1: Unauthenticated /portal → redirect to /login ──
  console.log("1. Middleware redirect (unauthenticated /portal)");
  const portalRes = await fetch(`${BASE}/portal`, { redirect: "manual" });
  assert(
    "/portal returns 307",
    portalRes.status === 307,
    `got ${portalRes.status}`
  );
  const location = portalRes.headers.get("location");
  assert(
    "redirects to /login",
    location?.includes("/login"),
    `location: ${location}`
  );

  // ── Test 2: Login page renders ──
  console.log("\n2. Login page renders");
  const loginRes = await fetch(`${BASE}/login`);
  const loginHtml = await loginRes.text();
  assert("GET /login returns 200", loginRes.status === 200, `got ${loginRes.status}`);
  assert(
    "contains 'Member Login'",
    loginHtml.includes("Member Login"),
    "text not found in HTML"
  );

  // ── Test 3: Magic link flow ──
  console.log("\n3. Magic link flow");
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: TEST_EMAIL,
    });

  if (linkError) {
    assert("generate magic link", false, linkError.message);
    return;
  }

  testUserId = linkData.user?.id;
  assert("magic link generated", !!linkData.properties?.action_link, "no action_link");

  // The action_link confirms the user via Supabase's implicit flow,
  // redirecting with tokens in the URL fragment (#access_token=...).
  // We follow the confirm link to verify the token, then build auth
  // cookies manually to test authenticated access.
  const actionLink = linkData.properties.action_link;
  const confirmRes = await fetch(actionLink, { redirect: "manual" });
  const confirmLocation = confirmRes.headers.get("location") || "";

  // Parse tokens from the fragment (after #)
  const fragment = confirmLocation.split("#")[1] || "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  assert(
    "confirm link returns tokens",
    !!accessToken && !!refreshToken,
    `no tokens in redirect`
  );

  if (!accessToken) {
    console.log("\n⚠️  Cannot continue without tokens. Skipping remaining tests.");
    return;
  }

  // Build Supabase SSR auth cookies
  // Cookie name pattern: sb-{project-ref}-auth-token
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Number(params.get("expires_at")),
      expires_in: Number(params.get("expires_in")),
      token_type: "bearer",
    })
  );

  // Split into chunks if needed (Supabase SSR chunks large cookies)
  const CHUNK_SIZE = 3180;
  let cookieHeader;
  if (cookieValue.length <= CHUNK_SIZE) {
    cookieHeader = `${cookieName}=${cookieValue}`;
  } else {
    const chunks = [];
    for (let i = 0; i < cookieValue.length; i += CHUNK_SIZE) {
      chunks.push(cookieValue.slice(i, i + CHUNK_SIZE));
    }
    cookieHeader = chunks.map((c, i) => `${cookieName}.${i}=${c}`).join("; ");
  }

  // ── Test 4: Authenticated access to /portal ──
  console.log("\n4. Authenticated access to /portal");

  const authedRes = await fetch(`${BASE}/portal`, {
    redirect: "manual",
    headers: { cookie: cookieHeader },
  });

  // Should NOT redirect to /login (404 is OK since portal page doesn't exist yet)
  assert(
    "/portal does NOT redirect to /login",
    authedRes.status !== 307,
    `got ${authedRes.status} with location ${authedRes.headers.get("location")}`
  );

  // ── Summary ──
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

try {
  await run();
} finally {
  await cleanup();
}

process.exit(failed > 0 ? 1 : 0);
