import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/lcaAdmin";
import { listPostings, createPosting } from "@/lib/lcaPostings";
import { sendComplianceNotice } from "@/lib/lcaNotify";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// List postings — any authenticated viewer.
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const postings = await listPostings();
    return Response.json({ postings, isAdmin: isAdminEmail(user.email) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Create a posting (upload) — admin only.
export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(user.email)) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("document");
  const fellowshipTitle = (form.get("fellowship_title") || "").toString().trim();
  const postedBy = (form.get("posted_by") || "").toString().trim();
  const postingDate = (form.get("posting_date") || "").toString().trim();
  const fellowName = (form.get("fellow_name") || "").toString().trim();
  const worksite = (form.get("worksite") || "").toString().trim();
  const notes = (form.get("notes") || "").toString().trim();

  const missing = [];
  if (!file || typeof file === "string" || file.size === 0) missing.push("document");
  if (!fellowshipTitle) missing.push("fellowship_title");
  if (!postedBy) missing.push("posted_by");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postingDate)) missing.push("posting_date");
  if (missing.length) {
    return Response.json(
      { error: `Missing or invalid: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const posting = await createPosting({
      file,
      fellowshipTitle,
      postedBy,
      postingDate,
      fellowName,
      worksite,
      notes,
      postedByEmail: user.email,
    });
    // Notify the OAF/BUILD compliance team that the notice was placed.
    const notified = await sendComplianceNotice({
      event: "placed",
      posting,
      actor: user.email,
    });
    return Response.json({ ok: true, posting, notified }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
