import { createClient } from "@/lib/supabase/server";
import { supabase as adminClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

// POST — start (or resume) dues payment for the logged-in member.
// Used by members who never completed their initial checkout ("pending").
// Members with an existing subscription (e.g. past_due) are sent to the
// Stripe billing portal instead, so we never create a duplicate subscription.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member, error } = await adminClient
    .from("members")
    .select("id, email, status")
    .eq("email", user.email)
    .single();

  if (error || !member) {
    return Response.json({ error: "No membership found" }, { status: 404 });
  }

  // If a live subscription already exists, updating the payment method in the
  // billing portal is the right move — a new checkout would duplicate it.
  // A canceled/expired subscription is NOT live, so those members fall through
  // to a fresh checkout below (which reactivates them via the webhook).
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const existingCustomerId = customers.data[0]?.id || null;

  if (existingCustomerId) {
    const subs = await stripe.subscriptions.list({
      customer: existingCustomerId,
      status: "all",
      limit: 10,
    });
    const openSub = subs.data.find((s) =>
      ["active", "past_due", "unpaid", "trialing", "incomplete"].includes(s.status)
    );
    if (openSub) {
      return Response.json({ useBilling: true });
    }
  }

  const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    // Reuse the member's existing Stripe customer on reactivation so we don't
    // create duplicate customers for the same email.
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: user.email }),
    allow_promotion_codes: true,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    metadata: { supabase_id: member.id },
    success_url: `${baseURL}/thanks`,
    cancel_url: `${baseURL}/portal`,
  });

  return Response.json({ url: session.url });
}
