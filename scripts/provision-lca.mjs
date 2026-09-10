/**
 * Provision the LCA intranet infrastructure.
 *  - creates the private "lca-documents" storage bucket (service role)
 *  - checks whether the lca_postings table exists
 *
 * Usage: node scripts/provision-lca.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const BUCKET = "lca-documents";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function ensureBucket() {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);
  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`  ✅ bucket "${BUCKET}" already exists (private)`);
    return;
  }
  const { error: createErr } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: "20MB",
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  });
  if (createErr) throw new Error(`createBucket: ${createErr.message}`);
  console.log(`  ✅ created private bucket "${BUCKET}"`);
}

async function checkTable() {
  const { error } = await admin.from("lca_postings").select("id").limit(1);
  if (!error) {
    console.log("  ✅ table lca_postings exists");
    return true;
  }
  if (/does not exist|schema cache|relation/i.test(error.message)) {
    console.log("  ⚠️  table lca_postings NOT found");
    console.log("     → run scripts/lca-schema.sql in the Supabase SQL editor.");
    return false;
  }
  throw new Error(`table check: ${error.message}`);
}

async function run() {
  console.log("\n🏗️  Provisioning LCA intranet\n");
  console.log("Storage:");
  await ensureBucket();
  console.log("\nDatabase:");
  const ok = await checkTable();
  console.log(`\n${ok ? "✅ Ready." : "⚠️  Bucket ready; create the table, then re-run."}\n`);
  process.exit(ok ? 0 : 2);
}

run().catch((e) => {
  console.error("🔥", e.message);
  process.exit(1);
});
