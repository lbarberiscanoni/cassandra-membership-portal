import { runReadyToRemoveReminders } from "@/lib/lcaReminders";

export const dynamic = "force-dynamic";

// Guarded by CRON_SECRET (Bearer header or ?secret=). No user session — this is
// called by a scheduler, not a logged-in user. If CRON_SECRET is unset, deny.
function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  return header === `Bearer ${secret}` || qs === secret;
}

async function handle(req) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // asOf is for testing/backfill only; scheduler calls with no override.
  const asOf = new URL(req.url).searchParams.get("asOf") || undefined;
  try {
    const summary = await runReadyToRemoveReminders({ asOf });
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  return handle(req);
}
export async function POST(req) {
  return handle(req);
}
