/**
 * Server-side data access for LCA postings.
 * Uses the service-role admin client (bypasses RLS). Import only from server code.
 */
import { supabase as admin } from "@/lib/supabase";
import {
  computeWindow,
  postingStatus,
  businessDaysRemaining,
  BUSINESS_DAYS_REQUIRED,
} from "./lcaCompliance.mjs";

export const BUCKET = "lca-documents";

/** Add computed compliance fields to a raw DB row. */
export function enrichPosting(row) {
  const window = computeWindow(row.posting_date, row.business_days || BUSINESS_DAYS_REQUIRED);
  const status = postingStatus({
    remainsThrough: window.remainsThrough,
    removedAt: row.removed_at || null,
  });
  return {
    ...row,
    window,
    status,
    businessDaysRemaining:
      status === "active" ? businessDaysRemaining(window.remainsThrough) : 0,
  };
}

export async function listPostings() {
  const { data, error } = await admin
    .from("lca_postings")
    .select("*")
    .order("posting_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(enrichPosting);
}

export async function getPosting(id) {
  const { data, error } = await admin
    .from("lca_postings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? enrichPosting(data) : null;
}

/**
 * Upload the LCA document to the private bucket and insert the posting row.
 * @param {object} p
 * @param {File} p.file        the uploaded LCA document (from multipart form data)
 * @param {string} p.fellowshipTitle
 * @param {string} p.postedBy
 * @param {string} p.postingDate  'YYYY-MM-DD'
 * @param {string} [p.fellowName]
 * @param {string} [p.worksite]
 * @param {string} [p.notes]
 * @param {string} [p.postedByEmail]
 */
export async function createPosting(p) {
  const window = computeWindow(p.postingDate);
  const id = crypto.randomUUID();

  const safeName = (p.file?.name || "lca-posting").replace(/[^\w.\-]+/g, "_");
  const path = `postings/${id}/${safeName}`;

  const bytes = Buffer.from(await p.file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: p.file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

  const { data, error } = await admin
    .from("lca_postings")
    .insert({
      id,
      fellowship_title: p.fellowshipTitle,
      fellow_name: p.fellowName || null,
      worksite: p.worksite || null,
      posted_by: p.postedBy,
      posted_by_email: p.postedByEmail || null,
      posting_date: p.postingDate,
      remains_through: window.remainsThrough,
      business_days: BUSINESS_DAYS_REQUIRED,
      document_path: path,
      document_name: p.file?.name || safeName,
      document_type: p.file?.type || null,
      notes: p.notes || null,
    })
    .select("*")
    .single();

  if (error) {
    // roll back the uploaded object so we don't orphan storage
    await admin.storage.from(BUCKET).remove([path]).catch(() => {});
    throw error;
  }
  return enrichPosting(data);
}

export async function confirmRemoval(id, removedBy) {
  const { data, error } = await admin
    .from("lca_postings")
    .update({ removed_at: new Date().toISOString(), removed_by: removedBy || null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return enrichPosting(data);
}

export async function reopenPosting(id) {
  const { data, error } = await admin
    .from("lca_postings")
    .update({ removed_at: null, removed_by: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return enrichPosting(data);
}

export async function deletePosting(id) {
  const existing = await getPosting(id);
  if (existing?.document_path) {
    await admin.storage.from(BUCKET).remove([existing.document_path]).catch(() => {});
  }
  const { error } = await admin.from("lca_postings").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/** Short-lived signed URL for an authenticated viewer to open the document. */
export async function signedDocumentUrl(path, expiresIn = 300) {
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
