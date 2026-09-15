/**
 * Admin gate for LCA posting management.
 *
 * Any authenticated user may VIEW the LCA intranet (the notice must be
 * available to the fellow workforce). Only admins listed in LCA_ADMIN_EMAILS
 * may upload, confirm removal, or delete postings.
 */
export function adminEmails() {
  return (process.env.LCA_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(String(email).trim().toLowerCase());
}

/**
 * Staff/domain gate for VIEWING the LCA intranet: anyone with a
 * @cassandralabs.org address is Cassandra Labs staff and may view postings.
 * (Admins and members/fellows are additionally allowed by the LCA page.)
 */
const STAFF_DOMAIN = "cassandralabs.org";
export function isStaffEmail(email) {
  if (!email) return false;
  return String(email).trim().toLowerCase().endsWith(`@${STAFF_DOMAIN}`);
}
