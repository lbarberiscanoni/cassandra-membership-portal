import { createClient } from "@/lib/supabase/server";
import { supabase as adminClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import PortalForm from "./PortalForm";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member, error } = await adminClient
    .from("members")
    .select("*")
    .eq("email", user.email)
    .single();

  if (error || !member) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-4">No membership found</h1>
        <p className="text-gray-600 mb-6">
          We couldn't find a membership for <strong>{user.email}</strong>.
        </p>
        <a href="/membership" className="text-blue-600 underline">
          Sign up for membership
        </a>
      </main>
    );
  }

  return <PortalForm member={member} />;
}
