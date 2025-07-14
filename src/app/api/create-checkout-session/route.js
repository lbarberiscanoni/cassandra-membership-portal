import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    const data = await req.json();           // form payload

    /* 1. Store provisional member row */
    const { data: draft, error } = await supabase
      .from("members")
      .insert({
        email:           data.email,
        name:            data.name,
        street_address:  data.streetAddress,
        phone:           data.phone,               // optional
        is_adult:        data.isAdult,
        mission:         data.mission,
        participation: Array.isArray(data.participation)
          ? data.participation
          : data.participation
          ? [data.participation]
          : [],
        meeting_pref:    data.meetingPref,

        /* remote ballot */
        board_choice:    data.board_choice,
        write_in:        data.write_in,
        bylaws_yesno:    data.bylaws_yesno,

        /* optional agenda + questions */
        agenda_items:    data.agendaItems,
        member_questions: data.member_questions,

        status: "pending",
      })
      .select()
      .single();                                             // returns { …row… }

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json(
        { error: error.message ?? "Database error" },
        { status: 500 }
      );
    }


    /* 2. Create Stripe Checkout session */
    const session = await stripe.checkout.sessions.create({
      mode:            "payment",
      customer_email:  data.email,
      line_items:      [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      discounts:       data.coupon ? [{ coupon: data.coupon }] : undefined,
      metadata:        { supabase_id: draft.id },   // link row for webhook
      success_url:     `${process.env.NEXT_PUBLIC_BASE_URL}/thanks`,
      cancel_url:      `${process.env.NEXT_PUBLIC_BASE_URL}/membership?canceled=1`,
    });

      return Response.json({ url: session.url });
  } catch (err) {
    console.error("Unhandled error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}