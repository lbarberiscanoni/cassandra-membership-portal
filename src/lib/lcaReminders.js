/**
 * "Ready to remove" reminders.
 *
 * A posting's required posting window completes by the calendar advancing, not by
 * any in-app action, so a scheduled daily run emails the compliance team on the
 * first day each still-posted notice becomes removable (its `earliestRemoval`).
 *
 * Matching on earliestRemoval === today makes it fire exactly once per posting
 * under a once-daily schedule, with no extra state column.
 */
import { supabase as admin } from "@/lib/supabase";
import { enrichPosting } from "@/lib/lcaPostings";
import { sendComplianceNotice } from "@/lib/lcaNotify";

/**
 * @param {object} [opts]
 * @param {string} [opts.asOf] 'YYYY-MM-DD' reference date (defaults to today).
 * @returns {{asOf:string, checked:number, due:number, sent:number, results:object[]}}
 */
export async function runReadyToRemoveReminders({ asOf } = {}) {
  const today = asOf || new Date().toISOString().slice(0, 10);

  // Only postings still up (not yet removed) can become "ready to remove".
  const { data, error } = await admin
    .from("lca_postings")
    .select("*")
    .is("removed_at", null);
  if (error) throw error;

  const due = (data || [])
    .map(enrichPosting)
    .filter((p) => p.status === "window_complete" && p.window.earliestRemoval === today);

  const results = [];
  for (const p of due) {
    const r = await sendComplianceNotice({ event: "ready", posting: p });
    results.push({ id: p.id, fellowship: p.fellowship_title, ok: r.ok, to: r.to, error: r.error });
  }

  return {
    asOf: today,
    checked: data?.length || 0,
    due: due.length,
    sent: results.filter((r) => r.ok).length,
    results,
  };
}
