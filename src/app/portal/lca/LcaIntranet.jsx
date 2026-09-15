"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";

/* ---------- date formatting (calendar-stable, UTC) ---------- */
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
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
  });
}

const STATUS = {
  active: {
    label: "Active",
    cls: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
  },
  window_complete: {
    label: "Window complete",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  removed: {
    label: "Removed",
    cls: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
};

export default function LcaIntranet({
  postings,
  isAdmin,
  viewerEmail,
  defaultPoster,
  loadError,
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <a href="/portal" className="text-sm text-blue-600 hover:underline">
            ← Back to portal
          </a>
          <h1 className="mt-2 text-3xl font-semibold">LCA Postings</h1>
          <p className="mt-1 max-w-2xl text-gray-600">
            Cassandra Labs BUILD Fellowship — internal electronic notices of
            filed H-1B Labor Condition Applications. Each notice must remain
            available for <strong>12 consecutive business days</strong>;
            federal holidays inside the window extend it automatically.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm((s) => !s)}>
            <Upload className="h-4 w-4" />
            {showForm ? "Close" : "New posting"}
          </Button>
        )}
      </div>

      {!isAdmin && (
        <p className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          You are viewing the postings as a fellow/member. Placing and removing
          notices is handled by the compliance administrator.
        </p>
      )}

      {loadError && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p className="font-medium">The postings table isn’t ready yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">scripts/lca-schema.sql</code>{" "}
            in the Supabase SQL editor to create it. ({loadError})
          </p>
        </div>
      )}

      {isAdmin && showForm && (
        <PostingForm
          defaultPoster={defaultPoster || viewerEmail}
          onDone={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {/* Gallery */}
      {postings.length === 0 && !loadError ? (
        <p className="mt-12 text-center text-gray-500">
          No LCA notices posted yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {postings.map((p) => (
            <PostingCard
              key={p.id}
              posting={p}
              isAdmin={isAdmin}
              onChange={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Posting card                                                        */
/* ------------------------------------------------------------------ */
function PostingCard({ posting: p, isAdmin, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const status = STATUS[p.status] || STATUS.active;

  async function act(action) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/lca/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      onChange();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this posting and its document permanently?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/lca/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onChange();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Document */}
      <a
        href={`/api/portal/lca/${p.id}/document`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4 hover:bg-gray-100"
      >
        <FileText className="h-8 w-8 shrink-0 text-blue-600" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 group-hover:text-blue-700">
          {p.document_name}
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-blue-600" />
      </a>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold leading-snug">
            {p.fellowship_title}
          </h3>
          {p.fellow_name && (
            <p className="text-sm text-gray-600">Fellow: {p.fellow_name}</p>
          )}
          {p.worksite && (
            <p className="text-sm text-gray-500">{p.worksite}</p>
          )}
        </div>

        {/* Status */}
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.cls}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
          {p.status === "active" && (
            <> · {p.businessDaysRemaining} business day{p.businessDaysRemaining === 1 ? "" : "s"} left</>
          )}
        </span>

        {/* Compliance window */}
        <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-1.5 text-gray-700">
            <CalendarClock className="h-4 w-4 text-gray-400" />
            <span>
              Posted <strong>{fmtDate(p.posting_date)}</strong>
            </span>
          </div>
          <div className="mt-1 text-gray-700">
            Must remain through{" "}
            <strong>{fmtDate(p.window.remainsThrough)}</strong>{" "}
            <span className="text-gray-400">
              ({p.window.businessDaysRequired} business days)
            </span>
          </div>
          {p.window.holidaysInWindow.length > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              Extended for:{" "}
              {p.window.holidaysInWindow
                .map((h) => `${h.name} (${fmtDate(h.date)})`)
                .join(", ")}
            </div>
          )}
        </div>

        {/* Confirmations */}
        <div className="mt-auto space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
            <span>
              Placed by <strong className="text-gray-700">{p.posted_by}</strong>{" "}
              · confirmed {fmtDateTime(p.placed_confirmed_at)}
            </span>
          </div>
          {p.removed_at ? (
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>
                Removed{p.removed_by ? ` by ${p.removed_by}` : ""} · confirmed{" "}
                {fmtDateTime(p.removed_at)}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 text-gray-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Removal not yet confirmed</span>
            </div>
          )}
        </div>

        {err && <p className="text-xs text-red-600">{err}</p>}

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!p.removed_at && (
              <Button
                size="sm"
                variant={p.status === "active" ? "outline" : "default"}
                disabled={busy}
                onClick={() => {
                  const msg =
                    p.status === "active"
                      ? `Close this posting? The ${p.window.businessDaysRequired}-business-day window runs through ${fmtDate(
                          p.window.remainsThrough
                        )} and isn’t complete yet. Closing emails the removal notice to the compliance team.`
                      : "Close this posting? This emails the removal notice to the compliance team.";
                  if (!confirm(msg)) return;
                  act("confirm_removal");
                }}
              >
                Close
              </Button>
            )}
            {p.removed_at && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reopen")}>
                Reopen
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin upload form                                                   */
/* ------------------------------------------------------------------ */
function PostingForm({ defaultPoster, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/portal/lca", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onDone();
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">LCA document *</label>
        <input
          type="file"
          name="document"
          required
          accept=".pdf,.doc,.docx"
          className="!border-0 !p-0"
        />
        <p className="mt-1 text-xs text-gray-500">PDF or Word (.pdf, .doc, .docx)</p>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">Fellowship title *</label>
        <input
          name="fellowship_title"
          required
          placeholder="Computer Science Fellow — NY"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Fellow (employee) name</label>
        <input name="fellow_name" placeholder="Neha Mishra" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Worksite</label>
        <input name="worksite" placeholder="New York, NY" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Posting date *</label>
        <input type="date" name="posting_date" required defaultValue={today} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Posted by *</label>
        <input name="posted_by" required defaultValue={defaultPoster} />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea name="notes" rows={2} placeholder="Optional" />
      </div>

      {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}

      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Posting…" : "Post notice"}
        </Button>
      </div>
    </form>
  );
}
