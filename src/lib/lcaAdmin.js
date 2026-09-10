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
