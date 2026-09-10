import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/lcaAdmin";
import { confirmRemoval, reopenPosting, deletePosting } from "@/lib/lcaPostings";
import { sendComplianceNotice } from "@/lib/lcaNotify";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdminEmail(user.email))
    return { error: Response.json({ error: "Admin access required" }, { status: 403 }) };
  return { user };
}

// PATCH { action: "confirm_removal" | "reopen" } — admin only.
export async function PATCH(req, { params }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  let body = {};
  try {
    body = await req.json();
  } catch {
    /* empty body allowed */
  }

  try {
    if (body.action === "confirm_removal") {
      const posting = await confirmRemoval(id, body.removed_by || user.email);
      const notified = await sendComplianceNotice({
        event: "removed",
        posting,
        actor: body.removed_by || user.email,
      });
      return Response.json({ ok: true, posting, notified });
    }
    if (body.action === "reopen") {
      const posting = await reopenPosting(id);
      return Response.json({ ok: true, posting });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — admin only.
export async function DELETE(req, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  try {
    await deletePosting(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
