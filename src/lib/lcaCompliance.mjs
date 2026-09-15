/**
 * LCA posting compliance math.
 *
 * H-1B labor condition application (LCA) internal electronic notice must remain
 * available for at least 10 CONSECUTIVE BUSINESS DAYS (Cassandra Labs posts 12 as a
 * compliance margin). Weekends and U.S. federal holidays
 * do not count as business days, so a holiday inside the window pushes the end
 * date out by the corresponding number of calendar days.
 *
 * Pure functions only — no I/O — so this file is shared by the Next.js server
 * code (imported with the explicit .mjs extension) and the Node test script.
 * All date arithmetic is done at UTC midnight to avoid DST / timezone off-by-one.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
// Legal minimum is 10 consecutive business days; Cassandra Labs posts 12 as a
// compliance margin (posting longer than required is always safe).
export const BUSINESS_DAYS_REQUIRED = 12;

/* ------------------------------------------------------------------ */
/* Date helpers (ISO 'YYYY-MM-DD' <-> UTC Date)                         */
/* ------------------------------------------------------------------ */

/** Parse 'YYYY-MM-DD' to a Date at UTC midnight. */
export function parseISO(iso) {
  if (iso instanceof Date) return new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Format a UTC Date as 'YYYY-MM-DD'. */
export function toISO(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function addDays(date, n) {
  return new Date(date.getTime() + n * DAY_MS);
}

function dayOfWeek(date) {
  return date.getUTCDay(); // 0 = Sun ... 6 = Sat
}

/* ------------------------------------------------------------------ */
/* U.S. federal holidays (observed)                                    */
/* ------------------------------------------------------------------ */

// nth (1-based) weekday of a month. weekday: 0=Sun..6=Sat.
function nthWeekday(year, month /*0-based*/, weekday, n) {
  const first = new Date(Date.UTC(year, month, 1));
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + shift + (n - 1) * 7));
}

// Last weekday of a month.
function lastWeekday(year, month /*0-based*/, weekday) {
  const last = new Date(Date.UTC(year, month + 1, 0)); // last day of month
  const shift = (last.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, month, last.getUTCDate() - shift));
}

// Observed date for a fixed-date holiday: Sat -> prior Fri, Sun -> next Mon.
function observed(date) {
  const dow = date.getUTCDay();
  if (dow === 6) return addDays(date, -1); // Saturday -> Friday
  if (dow === 0) return addDays(date, 1); // Sunday -> Monday
  return date;
}

/**
 * Map of observed federal-holiday ISO date -> holiday name for a given year.
 * Fixed-date holidays are shifted to their observed date, which can land in an
 * adjacent year (e.g. Jan 1 on a Saturday is observed Dec 31 of the prior year).
 */
export function federalHolidays(year) {
  const out = new Map();
  const add = (date, name) => out.set(toISO(date), name);

  add(observed(new Date(Date.UTC(year, 0, 1))), "New Year's Day");
  add(nthWeekday(year, 0, 1, 3), "Birthday of Martin Luther King, Jr.");
  add(nthWeekday(year, 1, 1, 3), "Washington's Birthday");
  add(lastWeekday(year, 4, 1), "Memorial Day");
  add(observed(new Date(Date.UTC(year, 5, 19))), "Juneteenth National Independence Day");
  add(observed(new Date(Date.UTC(year, 6, 4))), "Independence Day");
  add(nthWeekday(year, 8, 1, 1), "Labor Day");
  add(nthWeekday(year, 9, 1, 2), "Columbus Day");
  add(observed(new Date(Date.UTC(year, 10, 11))), "Veterans Day");
  add(nthWeekday(year, 10, 4, 4), "Thanksgiving Day");
  add(observed(new Date(Date.UTC(year, 11, 25))), "Christmas Day");

  return out;
}

/**
 * Combined holiday map covering a start year and the following year, so windows
 * that cross a December -> January boundary see every relevant observed holiday.
 */
export function holidayMapFor(startYear) {
  const map = new Map(federalHolidays(startYear));
  for (const [iso, name] of federalHolidays(startYear + 1)) {
    if (!map.has(iso)) map.set(iso, name);
  }
  // Cover a Jan-1-on-Saturday observance that lands on Dec 31 of the prior year.
  for (const [iso, name] of federalHolidays(startYear - 1)) {
    if (!map.has(iso)) map.set(iso, name);
  }
  return map;
}

/** True when a date is Mon–Fri and not an observed federal holiday. */
export function isBusinessDay(date, holidayMap) {
  const dow = dayOfWeek(date);
  if (dow === 0 || dow === 6) return false;
  return !holidayMap.has(toISO(date));
}

/* ------------------------------------------------------------------ */
/* Posting window                                                      */
/* ------------------------------------------------------------------ */

/**
 * Compute the compliance window for a posting.
 *
 * @param {string} postingDate  'YYYY-MM-DD' the notice was placed.
 * @param {number} businessDaysRequired  default 10.
 * @returns {{
 *   postingDate: string,
 *   firstBusinessDay: string,   // first counted business day (>= postingDate)
 *   remainsThrough: string,     // date of the Nth business day; must stay up through this day
 *   earliestRemoval: string,    // first day it may be taken down (next day after remainsThrough)
 *   businessDaysRequired: number,
 *   calendarDays: number,       // inclusive span postingDate..remainsThrough
 *   holidaysInWindow: {date:string,name:string}[]  // observed holidays skipped inside the span
 * }}
 */
export function computeWindow(postingDate, businessDaysRequired = BUSINESS_DAYS_REQUIRED) {
  if (!Number.isInteger(businessDaysRequired) || businessDaysRequired < 1) {
    throw new Error("businessDaysRequired must be a positive integer");
  }
  const start = parseISO(postingDate);
  const holidayMap = holidayMapFor(start.getUTCFullYear());

  // First counted business day: the posting date itself if it's a business day,
  // otherwise the next business day.
  let firstBusiness = start;
  while (!isBusinessDay(firstBusiness, holidayMap)) {
    firstBusiness = addDays(firstBusiness, 1);
  }

  // Walk forward counting business days until we reach the required count.
  let counted = 0;
  let cursor = firstBusiness;
  let remainsThrough = firstBusiness;
  while (counted < businessDaysRequired) {
    if (isBusinessDay(cursor, holidayMap)) {
      counted += 1;
      remainsThrough = cursor;
    }
    if (counted < businessDaysRequired) cursor = addDays(cursor, 1);
  }

  // Observed holidays that fall within the span (the days that extended the window).
  const holidaysInWindow = [];
  for (let d = new Date(start.getTime()); d <= remainsThrough; d = addDays(d, 1)) {
    const name = holidayMap.get(toISO(d));
    if (name) holidaysInWindow.push({ date: toISO(d), name });
  }

  const calendarDays = Math.round((remainsThrough - start) / DAY_MS) + 1;

  return {
    postingDate: toISO(start),
    firstBusinessDay: toISO(firstBusiness),
    remainsThrough: toISO(remainsThrough),
    earliestRemoval: toISO(addDays(remainsThrough, 1)),
    businessDaysRequired,
    calendarDays,
    holidaysInWindow,
  };
}

/**
 * Status of a posting relative to a reference date.
 *  - 'active'          : still inside the required window (must stay up).
 *  - 'window_complete' : the required posting window has elapsed but removal is
 *                        not yet confirmed (safe to take down).
 *  - 'removed'         : removal has been confirmed.
 *
 * @param {object} p
 * @param {string} p.remainsThrough  ISO end date from computeWindow.
 * @param {string|null} [p.removedAt] ISO datetime removal was confirmed, or null.
 * @param {string|Date} [p.today]    reference date (default: now).
 */
export function postingStatus({ remainsThrough, removedAt = null, today = new Date() }) {
  if (removedAt) return "removed";
  const ref = parseISO(today instanceof Date ? toISO(today) : today);
  const end = parseISO(remainsThrough);
  return ref > end ? "window_complete" : "active";
}

/** Business days remaining (>=0) until the window is complete, inclusive of today. */
export function businessDaysRemaining(remainsThrough, today = new Date()) {
  const end = parseISO(remainsThrough);
  let ref = parseISO(today instanceof Date ? toISO(today) : today);
  if (ref > end) return 0;
  const holidayMap = holidayMapFor(ref.getUTCFullYear());
  let count = 0;
  for (let d = new Date(ref.getTime()); d <= end; d = addDays(d, 1)) {
    if (isBusinessDay(d, holidayMap)) count += 1;
  }
  return count;
}
