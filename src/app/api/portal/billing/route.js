import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// GET — fetch subscription info (no portal session)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return Response.json({ hasSubscription: false });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return Response.json({ hasSubscription: false });
  }

  const sub = subscriptions.data[0];
  return Response.json({
    hasSubscription: true,
    status: sub.status,
    nextDueDate: new Date(sub.current_period_end * 1000).toISOString(),
  });
}

// POST — create Stripe Customer Portal session
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return Response.json(
      { error: "No billing information found for this account." },
      { status: 404 }
    );
  }

  const baseURL =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${baseURL}/portal`,
  });

  return Response.json({ url: session.url });
}
