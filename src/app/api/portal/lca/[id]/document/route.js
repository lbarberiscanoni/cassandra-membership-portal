import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPosting, signedDocumentUrl } from "@/lib/lcaPostings";

// GET — redirect an authenticated viewer to a short-lived signed URL for the
// LCA document. Any logged-in fellow/member may view; the file lives in a
// private bucket and is never publicly reachable.
export async function GET(req, { params }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const posting = await getPosting(id);
    if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const url = await signedDocumentUrl(posting.document_path, 300);
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
