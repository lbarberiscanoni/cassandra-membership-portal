import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const id = session.metadata.supabase_id;

    await supabase
      .from("members")
      .update({
        status: "active",
        stripe_customer: session.customer,
        joined_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  return Response.json({ received: true });
}
