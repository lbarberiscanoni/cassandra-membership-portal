/**
 * One-time backfill: sync pending member status with Stripe subscriptions.
 * Skips OpenClaims members (they're active without Stripe).
 *
 * Usage: node scripts/backfill-status.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: "2023-10-16",
});

async function run() {
  console.log("\n📋 Backfill: Syncing pending members with Stripe\n");

  // Fetch all pending members (excluding openclaims)
  const { data: members, error } = await supabase
    .from("members")
    .select("id, email, name, source")
    .eq("status", "pending")
    .neq("source", "openclaims");

  if (error) {
    console.error("❌ Failed to fetch members:", error.message);
    process.exit(1);
  }

  console.log(`Found ${members.length} pending members to check\n`);

  let activated = 0;
  let noCustomer = 0;
  let noSubscription = 0;

  for (const member of members) {
    // Look up Stripe customer by email
    const customers = await stripe.customers.list({
      email: member.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log(`  ⬜ ${member.email} — no Stripe customer`);
      noCustomer++;
      continue;
    }

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      console.log(`  ⬜ ${member.email} — no active subscription`);
      noSubscription++;
      continue;
    }

    // Activate member
    const { error: updateError } = await supabase
      .from("members")
      .update({ status: "active" })
      .eq("id", member.id);

    if (updateError) {
      console.log(`  ❌ ${member.email} — update failed: ${updateError.message}`);
    } else {
      console.log(`  ✅ ${member.email} — activated`);
      activated++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Checked:         ${members.length}`);
  console.log(`Activated:       ${activated}`);
  console.log(`No Stripe acct:  ${noCustomer}`);
  console.log(`No active sub:   ${noSubscription}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

await run();
