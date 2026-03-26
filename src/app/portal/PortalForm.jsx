"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const PARTICIPATION_OPTIONS = [
  "Research",
  "Open-source dev",
  "Volunteer committees",
  "Regular member",
];

const INITIATIVE_OPTIONS = [
  "LLM Briefing of Changes in Prediction Markets",
  "Charity Angeling for the Synapse Victims",
  "Cassandra Legal Apprenticeship Program",
  "Initial Litigation Offerings",
  "Impact Certificate Exchange",
  "BUILD Fellowship for Immigrants of Extraordinary Ability",
  "Cassandra Journal with Replication Market instead of Peer Review",
  "Replication Markets (Prediction Markets for Scientific Replication)",
  "Legal Wrappers for DAOs",
  "Native-American-Reservation-as-a-Service",
  "Donor-Advised Funds as a Service",
  "Open-Source Banking-as-a-Service Platform",
];

const CREDIT_UNION_SERVICES = [
  "Savings account",
  "Checking account",
  "Vehicle loans",
  "Mortgage loans",
  "Credit cards",
  "Business accounts",
  "Other",
];

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
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

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
              options={PARTICIPATION_OPTIONS}
            />
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Initiative interests</h2>
            <CheckboxGroup
              control={control}
              name="initiatives"
              options={INITIATIVE_OPTIONS}
              labelClassName="font-medium text-sm"
            />
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
                    <SelectItem value="Live Zoom">Live Zoom</SelectItem>
                    <SelectItem value="Watch recording">Watch recording</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </section>

          <section>
            <h2 className="text-xl font-medium mb-4">Credit union interest</h2>
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
            <h2 className="text-xl font-medium mb-3">Initiative interests</h2>
            <TagList items={initiatives} />
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Meeting preference</h2>
            <p>{member.meeting_pref || <span className="text-gray-400">—</span>}</p>
          </section>

          <section>
            <h2 className="text-xl font-medium mb-3">Credit union interest</h2>
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
        ) : member.status === "canceled" ? (
          <p className="text-sm text-gray-600 mb-4">
            Your membership has been canceled. To rejoin,{" "}
            <a href="/membership" className="text-blue-600 underline">
              sign up again
            </a>
            .
          </p>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            No active subscription found.
          </p>
        )}

        {member.status !== "canceled" && (
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
