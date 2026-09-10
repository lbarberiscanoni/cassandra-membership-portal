import { createClient } from "@/lib/supabase/server";
import { supabase as admin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/lcaAdmin";
import { listPostings } from "@/lib/lcaPostings";
import LcaIntranet from "./LcaIntranet";

export const metadata = {
  title: "LCA Postings — Cassandra Labs BUILD Fellowship",
};

export const dynamic = "force-dynamic";

export default async function LcaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = isAdminEmail(user.email);

  // Prefill the poster name from the member record when available.
  let defaultPoster = "";
  try {
    const { data: member } = await admin
      .from("members")
      .select("name")
      .eq("email", user.email)
      .maybeSingle();
    if (member?.name) defaultPoster = member.name;
  } catch {
    /* members lookup is best-effort */
  }

  let postings = [];
  let loadError = null;
  try {
    postings = await listPostings();
  } catch (err) {
    loadError = err.message || "Could not load postings.";
  }

  return (
    <LcaIntranet
      postings={postings}
      isAdmin={isAdmin}
      viewerEmail={user.email}
      defaultPoster={defaultPoster}
      loadError={loadError}
    />
  );
}
