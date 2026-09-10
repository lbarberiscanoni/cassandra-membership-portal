/**
 * Compliance-event notifications for LCA postings.
 *
 * On each compliance event (notice PLACED / notice REMOVED) the OAF + BUILD
 * compliance team is emailed a confirmation they can file in the Public Access
 * File. Recipients come from LCA_NOTIFY_EMAILS (comma-separated).
 *
 * Set LCA_NOTIFY_DRYRUN=1 to log instead of send (used in tests so real
 * third-party recipients are never emailed during verification).
 */
import { getResend } from "@/lib/resend";

const FROM = process.env.EMAIL_FROM || "Cassandra Labs <hello@cassandralabs.org>";

export function notifyRecipients() {
  return (process.env.LCA_NOTIFY_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function fmtDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const EVENTS = {
  placed: {
    title: "LCA notice posted",
    color: "#166534",
    intro: (p) =>
      `This confirms that the H-1B Labor Condition Application internal electronic notice below was <strong>posted</strong> on the Cassandra Labs BUILD Fellowship intranet.`,
  },
  removed: {
    title: "LCA notice removed",
    color: "#6b7280",
    intro: (p) =>
      `This confirms that the H-1B Labor Condition Application internal electronic notice below was <strong>removed</strong> from the Cassandra Labs BUILD Fellowship intranet.`,
  },
  ready: {
    title: "LCA notice ready to remove",
    color: "#92400e",
    intro: (p) =>
      `The 10-business-day posting window for the H-1B Labor Condition Application notice below is now <strong>complete</strong>. You may remove the notice from the intranet — please confirm removal so it can be filed in the Public Access File.`,
  },
};

function buildHtml(event, p, actor) {
  const e = EVENTS[event];
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const window = p.window || {};
  const holidays =
    window.holidaysInWindow && window.holidaysInWindow.length
      ? window.holidaysInWindow.map((h) => `${h.name} (${fmtDate(h.date)})`).join(", ")
      : "None";

  const rows = [
    ["Fellowship", p.fellowship_title],
    ["Fellow", p.fellow_name || "—"],
    ["Worksite", p.worksite || "—"],
    ["Posted by", p.posted_by],
    ["Posting date", fmtDate(p.posting_date)],
    ["Must remain through", `${fmtDate(window.remainsThrough || p.remains_through)} (10 business days)`],
    ["Federal holidays in window", holidays],
  ];
  if (event === "placed") {
    rows.push(["Placement confirmed", fmtDateTime(p.placed_confirmed_at)]);
  }
  if (event === "removed") {
    rows.push(["Removal confirmed", fmtDateTime(p.removed_at)]);
    rows.push(["Removed by", p.removed_by || actor || "—"]);
  }
  if (event === "ready") {
    rows.push(["Window completed", fmtDate(window.remainsThrough || p.remains_through)]);
    rows.push(["Removable since", fmtDate(window.earliestRemoval)]);
  }

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0;color:#111827"><strong>${v}</strong></td></tr>`
    )
    .join("");

  return `
  <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#111827">
    <h2 style="color:${e.color};margin:0 0 4px">${e.title}</h2>
    <p style="color:#6b7280;margin:0 0 16px">${e.intro(p)}</p>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">${rowsHtml}</table>
    <p style="font-size:13px;color:#6b7280;margin:0 0 4px">Document: ${p.document_name || "—"}</p>
    ${appUrl ? `<p style="font-size:13px;margin:0"><a href="${appUrl}/portal/lca" style="color:#2563eb">View the posting intranet</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
    <p style="font-size:12px;color:#9ca3af;margin:0">Automated notice from the Cassandra Labs membership portal. Please retain for the Public Access File.</p>
  </div>`;
}

/**
 * Send a compliance-event notice. Never throws — returns a result object and
 * logs failures so a mail hiccup can't break the posting operation.
 * @param {"placed"|"removed"} event
 * @param {object} posting  enriched posting row
 * @param {string} [actor]  email/name of who triggered the event
 */
export async function sendComplianceNotice({ event, posting, actor }) {
  const to = notifyRecipients();
  if (!EVENTS[event]) return { ok: false, error: `unknown event ${event}` };
  if (!to.length) {
    console.warn("⚠️ LCA notify: no LCA_NOTIFY_EMAILS configured; skipping");
    return { ok: false, skipped: "no-recipients" };
  }

  const tag = { placed: "Posted", removed: "Removed", ready: "Ready to remove" }[event];
  const subject = `[LCA ${tag}] ${posting.fellowship_title} — ${fmtDate(posting.posting_date)}`;

  if (process.env.LCA_NOTIFY_DRYRUN === "1") {
    console.log(`✉️  LCA notify DRYRUN → [${to.join(", ")}] :: ${subject}`);
    return { ok: true, dryRun: true, to, subject };
  }

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: buildHtml(event, posting, actor),
    });
    if (error) throw error;
    console.log(`✅ LCA ${event} notice sent to ${to.join(", ")} (${data?.id})`);
    return { ok: true, id: data?.id, to };
  } catch (err) {
    console.error(`❌ LCA ${event} notice failed:`, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}
