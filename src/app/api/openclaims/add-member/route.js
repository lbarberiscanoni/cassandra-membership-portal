// src/app/api/openclaims/add-member/route.js
import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    const data = await req.json();

    // ── Validate required fields ──
    const missing = [];
    if (!data.name) missing.push("name");
    if (!data.email) missing.push("email");
    if (!data.address) missing.push("address");
    if (data.is_adult === undefined || data.is_adult === null) missing.push("is_adult");
    if (data.mission === undefined || data.mission === null) missing.push("mission");
    if (data.research_consent === undefined || data.research_consent === null) missing.push("research_consent");
    if (missing.length > 0) {
      return Response.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Age verification
    if (data.is_adult !== true) {
      return Response.json(
        { error: "is_adult must be true — members must be at least 18 years of age" },
        { status: 400 }
      );
    }

    // Mission affirmation
    if (data.mission !== true) {
      return Response.json(
        { error: "mission must be true — members must affirm the Cassandra Labs mission" },
        { status: 400 }
      );
    }

    // Research consent
    if (data.research_consent !== true) {
      return Response.json(
        { error: "research_consent must be true — members joining through OpenClaims participate via research" },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      return Response.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // ── Check for existing member by email ──
    const { data: existing, error: lookupError } = await supabase
      .from("members")
      .select("id, email, status, source")
      .eq("email", data.email.toLowerCase().trim())
      .maybeSingle();

    if (lookupError) {
      console.error("❌ Supabase lookup error:", lookupError);
      return Response.json(
        { error: "Database error during lookup" },
        { status: 500 }
      );
    }

    if (existing) {
      return Response.json(
        {
          error: "Member with this email already exists",
          existing_member_id: existing.id,
          status: existing.status,
        },
        { status: 409 }
      );
    }

    // ── Insert new member ──
    const { data: member, error: insertError } = await supabase
      .from("members")
      .insert({
        name:                  data.name.trim(),
        email:                 data.email.toLowerCase().trim(),
        phone:                 data.phone || null,
        street_address:        data.address.trim(),
        is_adult:              true,
        mission:               true,
        research_consent:      true,
        source:                "openclaims",
        source_detail:         data.source_detail || null,
        participation:         ["Regular member"],
        initiatives:           [],
        meeting_pref:          "Watch recording",
        credit_union_interest: null,
        credit_union_services: [],
        initial_deposit:       null,
        monthly_deposit:       null,
        credit_union_priority: null,
        signature:             data.name.trim(),
        voting_duty:           true,
        status:                "active",
        // Legacy fields
        board_choice:          null,
        write_in:              null,
        bylaws_yesno:          null,
        agenda_items:          null,
        member_questions:      null,
      })
      .select("id, email, name, status, source, created_at")
      .single();

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
      return Response.json(
        { error: insertError.message || "Database error" },
        { status: 500 }
      );
    }

    console.log("✅ OpenClaims member created:", member.id);

    return Response.json(
      { ok: true, member },
      { status: 201 }
    );
  } catch (err) {
    console.error("🔥 Unhandled error in openclaims/add-member:", err);
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}