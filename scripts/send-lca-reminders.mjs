/**
 * Trigger the "ready to remove" reminder check. Meant to run once daily from a
 * scheduler (system cron, GitHub Actions, Vercel Cron, etc.). It simply calls
 * the guarded cron route so all logic stays in one place (the app).
 *
 * Env: CRON_SECRET (required), CRON_BASE_URL or NEXT_PUBLIC_BASE_URL.
 * Usage: node scripts/send-lca-reminders.mjs
 * Cron:  0 13 * * *  cd /path/to/app && node scripts/send-lca-reminders.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE =
  process.env.CRON_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

const res = await fetch(`${BASE}/api/cron/lca-reminders`, {
  method: "POST",
  headers: { authorization: `Bearer ${SECRET}` },
});
const body = await res.text();
console.log(`${res.status} ${body}`);
process.exit(res.ok ? 0 : 1);
