import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  const data = await req.json(); // form payload

  // Store provisional member
  const { data: draft } = await supabase
    .from("members")
    .insert({
      email: data.email,
      draft_payload: data,
      status: "pending",
    })
    .select()
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: data.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    discounts: data.coupon ? [{ coupon: data.coupon }] : undefined,
    metadata: { supabase_id: draft.id },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/thanks`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?canceled=1`,
  });

  return Response.json({ url: session.url });
}