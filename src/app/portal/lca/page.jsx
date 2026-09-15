import { createClient } from "@/lib/supabase/server";
import { supabase as admin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { isAdminEmail, isStaffEmail } from "@/lib/lcaAdmin";
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

  // Prefill the poster name from the member record when available, and note
  // whether the viewer is a member (one of the view-authorization signals).
  let defaultPoster = "";
  let isMember = false;
  try {
    const { data: member } = await admin
      .from("members")
      .select("name")
      .eq("email", user.email)
      .maybeSingle();
    if (member) isMember = true;
    if (member?.name) defaultPoster = member.name;
  } catch {
    /* members lookup is best-effort */
  }

  // View access: admins, Cassandra Labs staff (@cassandralabs.org), and
  // members/fellows may view. The H-1B notice must stay available to the fellow
  // workforce, so members are always allowed regardless of email domain.
  if (!isAdmin && !isStaffEmail(user.email) && !isMember) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="mb-3 text-2xl font-semibold">No access</h1>
        <p className="text-gray-600">
          The LCA postings are available to Cassandra Labs staff and members.
          You are signed in as <strong>{user.email}</strong>.
        </p>
      </main>
    );
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
