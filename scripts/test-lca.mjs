/**
 * Unit tests for the LCA compliance date math.
 * Run: node scripts/test-lca.mjs
 * No framework — plain assertions against hand-verified expected values.
 */
import {
  federalHolidays,
  computeWindow,
  postingStatus,
  businessDaysRemaining,
  isBusinessDay,
  holidayMapFor,
} from "../src/lib/lcaCompliance.mjs";

let passed = 0;
let failed = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}\n       expected ${e}\n       got      ${a}`);
    failed++;
  }
}

console.log("\n🧪 LCA compliance math\n");

// ── Federal holidays 2026 (observed) ──
console.log("1. Federal holidays 2026 (observed dates)");
const h2026 = federalHolidays(2026);
const expectedHolidays2026 = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Birthday of Martin Luther King, Jr.",
  "2026-02-16": "Washington's Birthday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth National Independence Day",
  "2026-07-03": "Independence Day", // Jul 4 2026 is a Saturday -> observed Fri Jul 3
  "2026-09-07": "Labor Day",
  "2026-10-12": "Columbus Day",
  "2026-11-11": "Veterans Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
};
eq("11 holidays with correct observed dates", Object.fromEntries(h2026), expectedHolidays2026);

// ── isBusinessDay ──
console.log("\n2. isBusinessDay");
const hm = holidayMapFor(2026);
eq("Mon 2026-03-02 is a business day", isBusinessDay(new Date(Date.UTC(2026, 2, 2)), hm), true);
eq("Sat 2026-03-07 is NOT a business day", isBusinessDay(new Date(Date.UTC(2026, 2, 7)), hm), false);
eq("Observed Independence Day 2026-07-03 is NOT a business day", isBusinessDay(new Date(Date.UTC(2026, 6, 3)), hm), false);

// ── Simple window, no holidays (posting Monday) ──
console.log("\n3. Window: post Mon 2026-03-02, no holidays (12 business days)");
const wA = computeWindow("2026-03-02");
eq("policy default is 12 business days", wA.businessDaysRequired, 12);
eq("remainsThrough = Tue 2026-03-17 (12th business day)", wA.remainsThrough, "2026-03-17");
eq("firstBusinessDay = posting date", wA.firstBusinessDay, "2026-03-02");
eq("earliestRemoval = 2026-03-18", wA.earliestRemoval, "2026-03-18");
eq("calendarDays = 16", wA.calendarDays, 16);
eq("no holidays in window", wA.holidaysInWindow, []);

// ── Window crossing Memorial Day ──
console.log("\n4. Window: post Mon 2026-05-18, crosses Memorial Day");
const wB = computeWindow("2026-05-18");
eq("remainsThrough extended to Wed 2026-06-03", wB.remainsThrough, "2026-06-03");
eq("Memorial Day counted as the extension", wB.holidaysInWindow, [
  { date: "2026-05-25", name: "Memorial Day" },
]);
eq("calendarDays = 17", wB.calendarDays, 17);

// ── Posting on a weekend starts next business day ──
console.log("\n5. Window: post Sat 2026-03-07 -> starts Mon 2026-03-09");
const wC = computeWindow("2026-03-07");
eq("firstBusinessDay = Mon 2026-03-09", wC.firstBusinessDay, "2026-03-09");
eq("remainsThrough = Tue 2026-03-24", wC.remainsThrough, "2026-03-24");

// ── Observed holiday (Jul 4 Sat -> Fri Jul 3) inside window ──
console.log("\n6. Window: post Mon 2026-06-29, crosses observed Independence Day");
const wD = computeWindow("2026-06-29");
eq("remainsThrough = Wed 2026-07-15", wD.remainsThrough, "2026-07-15");
eq("observed Independence Day 07-03 in window", wD.holidaysInWindow, [
  { date: "2026-07-03", name: "Independence Day" },
]);

// ── Status + remaining ──
console.log("\n7. Status & business days remaining");
eq("active during window", postingStatus({ remainsThrough: "2026-03-13", today: "2026-03-05" }), "active");
eq("active on the last day", postingStatus({ remainsThrough: "2026-03-13", today: "2026-03-13" }), "active");
eq("window_complete after end", postingStatus({ remainsThrough: "2026-03-13", today: "2026-03-16" }), "window_complete");
eq("removed when removedAt set", postingStatus({ remainsThrough: "2026-03-13", removedAt: "2026-03-20T10:00:00Z", today: "2026-03-14" }), "removed");
eq("2 business days remaining Thu->Fri span", businessDaysRemaining("2026-03-13", "2026-03-12"), 2);
eq("0 business days remaining after end", businessDaysRemaining("2026-03-13", "2026-03-16"), 0);

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
