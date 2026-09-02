"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CREDIT_UNION_SERVICES,
  MEETING_PREFERENCES,
  PARTICIPATION_LABELS,
  RESEARCH_AGENDA_POLL_URL,
} from "@/lib/membershipOptions";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

function parseArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function Badge({ children }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mr-1 mb-1">
      {children}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div className="mb-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function TagList({ items, emptyText = "None selected" }) {
  if (!items || items.length === 0) {
    return <span className="text-gray-400 text-sm">{emptyText}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
    </div>
  );
}

// Checkbox group using Controller for proper hydration
function CheckboxGroup({ control, name, options, labelClassName }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <>
          {options.map((label) => {
            const checked = (field.value || []).includes(label);
            return (
              <div key={label} className="flex items-center gap-2 mb-2">
                <Checkbox
                  id={`${name}-${label}`}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const current = field.value || [];
                    field.onChange(
                      isChecked
                        ? [...current, label]
                        : current.filter((v) => v !== label)
                    );
                  }}
                />
                <label
                  htmlFor={`${name}-${label}`}
                  className={labelClassName || "font-medium"}
                >
                  {label}
                </label>
              </div>
            );
          })}
        </>
      )}
    />
  );
}

export default function PortalForm({ member }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

  // Members who aren't paid up. Each gets a one-click recovery button:
  // "pending"  → never completed the first checkout (no subscription).
  // "past_due" → a renewal charge failed (subscription exists, card needs fixing).
  // "canceled" → membership lapsed (usually a failed renewal that dunning gave
  //              up on); their profile is kept so they can reactivate in one click.
  const canceled = member.status === "canceled";
  const duesUnpaid =
    member.status === "pending" || member.status === "past_due";
  const needsPayment = duesUnpaid || canceled;

  useEffect(() => {
    fetch("/api/portal/billing")
      .then((r) => r.json())
      .then((data) => setSubscription(data))
      .catch(() => setSubscription({ hasSubscription: false }))
      .finally(() => setSubLoading(false));
  }, []);

  const participation = parseArray(member.participation);
  const initiatives = parseArray(member.initiatives);
  const creditUnionServices = parseArray(member.credit_union_services);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
  } = useForm({
    defaultValues: {
      name: member.name || "",
      phone: member.phone || "",
      streetAddress: member.street_address || "",
      participation,
      initiatives,
      meetingPref: member.meeting_pref || "Watch recording",
      creditUnionInterest: member.credit_union_interest || "",
      creditUnionServices,
      initialDeposit: member.initial_deposit || "",
      monthlyDeposit: member.monthly_deposit || "",
      creditUnionPriority: member.credit_union_priority || "",
    },
  });

  const onSubmit = async (data) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to save");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    reset();
    setEditing(false);
    setError(null);
  };

  const handleBilling = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/portal/billing", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      } else {
        setError(body.error || "Could not open billing portal");
        setBillingLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setBillingLoading(false);
    }
  };

  // Pay outstanding dues. Pending members get a fresh Stripe Checkout;
  // members who already have a subscription are routed to the billing portal
  // (to update their card) so we never create a duplicate subscription.
  const handlePay = async () => {
    setPayLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/pay", { method: "POST" });
      const body = await res.json();
      if (body.useBilling) {
        await handleBilling();
        return;
      }
      if (body.url) {
        window.location.href = body.url;
      } else {
        setError(body.error || "Could not start payment");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  const memberSince = new Date(member.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Member Portal</h1>
          <p className="text-gray-600 mt-1">{member.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                member.status === "active"
                  ? "bg-green-100 text-green-800"
                  : member.status === "canceled"
                  ? "bg-red-100 text-red-800"
                  : member.status === "past_due"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {member.status === "past_due" ? "past due" : member.status}
            </span>
            <span className="text-sm text-gray-500">
              Member since {memberSince}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {/* ──────── NOT PAID UP: prominent recovery banner ──────── */}
      {needsPayment && (
        <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">
            {member.status === "past_due"
              ? "Your dues payment didn't go through"
              : canceled
              ? "Your membership isn't active"
              : "Your membership isn't active yet"}
          </h2>
          <p className="mt-1 text-sm text-amber-900">
            {member.status === "past_due"
              ? "Your last $1.00 annual dues charge failed. Update your payment method to keep your membership active — you won't be charged twice."
              : canceled
              ? "Your membership lapsed after your annual dues went unpaid. We've kept your profile — reactivate anytime with a single $1.00 payment. Your info below stays exactly as it is."
              : "You're all signed up, but your one-time $1.00 annual dues haven't been paid yet. Complete payment to activate your membership."}
          </p>
          <Button
            onClick={handlePay}
            disabled={payLoading || billingLoading}
            className="mt-4 bg-amber-600 hover:bg-amber-700"
          >
            {payLoading || billingLoading
              ? "Opening secure checkout…"
              : member.status === "past_due"
              ? "Update payment method"
              : canceled
              ? "Reactivate — pay $1"
              : "Pay $1 dues now"}
          </Button>
        </div>
      )}

      {editing ? (
        /* ──────── EDIT MODE ──────── */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <section>
            <h2 className="text-xl font-medium mb-4">Contact information</h2>
            <div className="mb-4">
              <label className="block font-medium mb-1">Name</label>
              <Input {...register("name", { required: true })} />
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Phone</label>
              <Input {...register("phone")} />
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Address</label>
              <Input {...register("streetAddress")} />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Participation areas</h2>
            <CheckboxGroup
              control={control}
              name="participation"
              options={PARTICIPATION_LABELS}
            />
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Research agenda ranking</h2>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                Use the external drag-and-drop ranked-choice ballot. This is the only
                place your research ranking is recorded.
              </p>
              <a
                href={RESEARCH_AGENDA_POLL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-medium text-blue-700 underline"
              >
                Open the ranked-choice ballot →
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Meeting preference</h2>
            <Controller
              control={control}
              name="meetingPref"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_PREFERENCES.map((preference) => (
                      <SelectItem key={preference} value={preference}>
                        {preference}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">
              Pynthia Credit Union interest
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Pynthia is a proposed California state-chartered credit union. This optional
              section helps us understand member interest and needs.
            </p>
            <div className="mb-4">
              <Controller
                control={control}
                name="creditUnionInterest"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your interest level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes, definitely interested</SelectItem>
                      <SelectItem value="maybe">Maybe, tell me more</SelectItem>
                      <SelectItem value="no">No, not interested</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {(watch("creditUnionInterest") === "yes" ||
              watch("creditUnionInterest") === "maybe") && (
              <>
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Products/services needed
                  </label>
                  <CheckboxGroup
                    control={control}
                    name="creditUnionServices"
                    options={CREDIT_UNION_SERVICES}
                    labelClassName="text-sm"
                  />
                </div>
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Estimated initial deposit
                  </label>
                  <Input type="number" placeholder="$" {...register("initialDeposit")} />
                </div>
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Expected monthly deposits
                  </label>
                  <Input type="number" placeholder="$" {...register("monthlyDeposit")} />
                </div>
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Top priority from a credit union
                  </label>
                  <Textarea rows={2} {...register("creditUnionPriority")} />
                </div>
              </>
            )}
          </section>

          <section className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </section>
        </form>
      ) : (
        /* ──────── READ-ONLY VIEW ──────── */
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-medium mb-3">Contact information</h2>
            <dl>
              <Field label="Name" value={member.name} />
              <Field label="Phone" value={member.phone} />
              <Field label="Address" value={member.street_address} />
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Participation areas</h2>
            <TagList items={participation} />
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Research agenda ranking</h2>
            <p className="text-sm text-gray-600">
              Submit or update your ranking on the external drag-and-drop ballot.
            </p>
            <a
              href={RESEARCH_AGENDA_POLL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-medium text-blue-600 underline"
            >
              Rank the research and public-goods agenda →
            </a>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Meeting preference</h2>
            <p>{member.meeting_pref || <span className="text-gray-400">—</span>}</p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">
              Pynthia Credit Union interest
            </h2>
            <Field
              label="Interest level"
              value={
                member.credit_union_interest === "yes"
                  ? "Yes, definitely interested"
                  : member.credit_union_interest === "maybe"
                  ? "Maybe, tell me more"
                  : member.credit_union_interest === "no"
                  ? "No, not interested"
                  : null
              }
            />
            {(member.credit_union_interest === "yes" ||
              member.credit_union_interest === "maybe") && (
              <>
                <div className="mb-3">
                  <dt className="text-sm text-gray-500">Services</dt>
                  <dd className="mt-0.5">
                    <TagList items={creditUnionServices} />
                  </dd>
                </div>
                <Field label="Initial deposit" value={member.initial_deposit ? `$${member.initial_deposit}` : null} />
                <Field label="Monthly deposits" value={member.monthly_deposit ? `$${member.monthly_deposit}` : null} />
                <Field label="Top priority" value={member.credit_union_priority} />
              </>
            )}
          </section>

          <Button onClick={() => setEditing(true)}>Edit profile</Button>
        </div>
      )}

      {/* Donations */}
      <section className="mt-10 pt-8 border-t">
        <h2 className="text-xl font-medium mb-2">Annual Dues</h2>
        <p className="text-sm text-gray-600 mb-4">
          Cassandra Labs membership is sustained by a yearly <strong>$1.00</strong> donation
          processed securely through Stripe. You can update your payment method,
          view donation history, or cancel anytime.
        </p>

        {subLoading ? (
          <p className="text-sm text-gray-400">Loading subscription info...</p>
        ) : subscription?.hasSubscription ? (
          <p className="text-sm text-gray-700 mb-4">
            Next due:{" "}
            <strong>
              {new Date(subscription.nextDueDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </strong>
          </p>
        ) : needsPayment ? (
          <p className="text-sm text-gray-600 mb-4">
            {canceled
              ? "Use the Reactivate button above to restart your membership — your profile stays as-is."
              : "Your dues aren't settled yet — use the button above to finish."}
          </p>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            No active subscription found.
          </p>
        )}

        {!needsPayment && (
          <Button
            variant="outline"
            onClick={handleBilling}
            disabled={billingLoading}
          >
            {billingLoading ? "Opening..." : "Manage on Stripe"}
          </Button>
        )}
      </section>
    </main>
  );
}
