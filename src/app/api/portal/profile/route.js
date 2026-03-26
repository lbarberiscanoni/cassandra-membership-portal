import { createClient } from "@/lib/supabase/server";
import { supabase as adminClient } from "@/lib/supabase";

export async function PUT(req) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();

  const { error } = await adminClient
    .from("members")
    .update({
      name: data.name,
      phone: data.phone || null,
      street_address: data.streetAddress || null,
      participation: Array.isArray(data.participation)
        ? data.participation
        : [],
      initiatives: Array.isArray(data.initiatives) ? data.initiatives : [],
      meeting_pref: data.meetingPref || null,
      credit_union_interest: data.creditUnionInterest || null,
      credit_union_services: Array.isArray(data.creditUnionServices)
        ? data.creditUnionServices
        : [],
      initial_deposit: data.initialDeposit || null,
      monthly_deposit: data.monthlyDeposit || null,
      credit_union_priority: data.creditUnionPriority || null,
    })
    .eq("email", user.email);

  if (error) {
    console.error("❌ Profile update failed:", error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
