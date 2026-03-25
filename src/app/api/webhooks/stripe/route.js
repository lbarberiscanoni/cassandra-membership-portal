import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/sendWelcomeEmail";

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const supabaseId = session.metadata?.supabase_id;

    if (!supabaseId) {
      console.error("❌ No supabase_id in session metadata");
      return new Response("Missing supabase_id", { status: 400 });
    }

    // Mark member as active
    const { data: member, error: updateError } = await supabase
      .from("members")
      .update({ status: "active" })
      .eq("id", supabaseId)
      .select("name, email")
      .single();

    if (updateError) {
      console.error("❌ Failed to activate member:", updateError);
      return new Response("Database error", { status: 500 });
    }

    console.log(`✅ Member ${supabaseId} activated`);

    // Send welcome email (non-blocking — don't fail the webhook if email fails)
    try {
      await sendWelcomeEmail({ name: member.name, email: member.email });
    } catch (err) {
      console.error("⚠️ Welcome email failed but member is active:", err);
    }
  }

  return new Response("ok", { status: 200 });
}
