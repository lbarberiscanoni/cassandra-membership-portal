// src/app/api/create-checkout-session/route.js
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req) {

  try {
    // 1️⃣ Parse incoming form data
    const data = await req.json();
    console.log("📥 Received form payload:", data);

    // 2️⃣ Insert draft member into Supabase
    const { data: draft, error: insertError } = await supabase
      .from("members")
      .insert({
        email:           data.email,
        name:            data.name,
        street_address:  data.streetAddress,
        phone:           data.phone || null,
        is_adult:        data.isAdult,
        mission:         data.mission,
        participation: Array.isArray(data.participation)
          ? data.participation
          : data.participation
          ? [data.participation]
          : [],
        meeting_pref:    data.meetingPref,
        board_choice:    data.board_choice,
        write_in:        data.write_in || null,
        bylaws_yesno:    data.bylaws_yesno,
        agenda_items:    data.agendaItems || null,
        member_questions:data.member_questions || null,
        signature:       data.signature,
        voting_duty:     data.votingDuty,
        status:          "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message || "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("✅ Created draft member:", draft);

    // 3️⃣ Create Stripe Checkout session
    const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const urlCoupon = new URL(req.url).searchParams.get("coupon");  
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: data.email,
      allow_promotion_codes: true,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { supabase_id: draft.id },
      discounts: urlCoupon ? [{ coupon: urlCoupon }] : [],
      success_url: `${baseURL}/thanks`,
      cancel_url:  `${baseURL}/membership?canceled=1`,
    });

    console.log("→ Created Stripe session:", session.id, "redirect:", session.url);

    // 4️⃣ Respond with checkout URL and new member ID
    return new Response(JSON.stringify({ url: session.url, memberId: draft.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("🔥 Unhandled error in create-checkout-session:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}