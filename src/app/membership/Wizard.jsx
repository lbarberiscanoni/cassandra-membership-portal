/* src/app/membership/Wizard.jsx */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

/* helper for error text */
const FieldErr = ({ errors, name }) =>
  errors[name] ? (
    <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
  ) : null;

export default function MembershipWizard() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  const router = useRouter();
  const coupon = useSearchParams().get("coupon");

  const onSubmit = async (data) => {
    const r = await fetch("/api/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ ...data, coupon }),
    });
    const { url } = await r.json();
    router.push(url);
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-semibold mb-6">
        Cassandra Membership Form
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* ---------- 1 · IDENTITY ---------- */}
        <section>
          <h2 className="text-xl font-medium mb-4">1 Identity</h2>

          <div className="mb-4">
            <label className="block font-medium mb-1">Legal name</label>
            <Input {...register("name", { required: "Required" })} />
            <FieldErr errors={errors} name="name" />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Email</label>
            <Input
              type="email"
              {...register("email", {
                required: "Required",
                pattern: { value: /^\S+@\S+$/, message: "Invalid email" },
              })}
            />
            <FieldErr errors={errors} name="email" />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Phone (optional)</label>
            <Input {...register("phone")} />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Physical address</label>
            <Input
              {...register("address", { required: "Required" })}
            />
            <FieldErr errors={errors} name="address" />
          </div>

          <Controller
            control={control}
            name="isAdult"
            rules={{ required: "Required" }}
            render={({ field }) => (
              <label className="inline-flex items-center gap-2">
                <Checkbox
                  id="isAdult"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
                <span>I am 18 years or older</span>
              </label>
            )}
          />
          <FieldErr errors={errors} name="isAdult" />
        </section>

        {/* ---------- 2 · MISSION ---------- */}
        <section>
          <h2 className="text-xl font-medium mb-4">2 Mission affirmation</h2>

          <Controller
            control={control}
            name="mission"
            rules={{ required: "Required" }}
            render={({ field }) => (
              <label className="inline-flex items-center gap-2">
                <Checkbox
                  id="mission"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
                <span>
                  I support Cassandra’s charitable, educational & scientific
                  mission
                </span>
              </label>
            )}
          />
          <FieldErr errors={errors} name="mission" />
        </section>

        {/* ---------- 3 · PARTICIPATION ---------- */}
        <section>
          <h2 className="text-xl font-medium mb-4">3 Participation areas</h2>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {["Research", "Open-source dev", "Volunteer committees"].map((opt) => (
              <label key={opt} className="inline-flex items-center gap-2">
                <Checkbox
                  id={opt}
                  value={opt}
                  {...register("participation")}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ---------- 4 · MEETING PREFS ---------- */}
        <section>
          <h2 className="text-xl font-medium mb-4">4 Meeting preferences</h2>

          <div className="mb-4">
            <label className="block font-medium mb-1">
              Preferred timezone (e.g. PST, UTC+1)
            </label>
            <Input
              {...register("timezone", { required: "Required" })}
            />
            <FieldErr errors={errors} name="timezone" />
          </div>

          <Controller
            control={control}
            name="meetingPref"
            rules={{ required: "Required" }}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="space-y-1"
              >
                {["Live Zoom", "Watch recording"].map((opt) => (
                  <label
                    key={opt}
                    className="inline-flex items-center gap-2"
                    htmlFor={opt}
                  >
                    <RadioGroupItem value={opt} id={opt} />
                    <span>{opt}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          <FieldErr errors={errors} name="meetingPref" />
        </section>

        {/* ---------- 5 · NOMINATIONS & AGENDA ---------- */}
        <section className="pt-6">
          <h2 className="text-xl font-medium mb-4">
            5 Optional nominations &amp; agenda ideas
          </h2>

          {/* nominate someone else */}
          <div className="mb-4">
            <label className="block font-medium mb-1">
              Nominate a board candidate (optional)
            </label>
            <Input
              placeholder="e.g. Jane Smith"
              {...register("proposedCandidate")}
            />
          </div>

          {/* agenda / motions */}
          <div>
            <label className="block font-medium mb-1">
              Agenda items or motions you’d like discussed (optional)
            </label>
            <Textarea
              rows={3}
              placeholder="Your suggestions…"
              {...register("agendaItems")}
            />
          </div>
        </section>

        {/* ---------- 6 · VOTING + SIGNATURE ---------- */}
        <section>
          <h2 className="text-xl font-medium mb-4">
            5 Voting duty & signature
          </h2>

          <Controller
            control={control}
            name="votingDuty"
            rules={{ required: "Required" }}
            render={({ field }) => (
              <label className="inline-flex items-center gap-2 mb-2">
                <Checkbox
                  id="votingDuty"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
                <span>
                  I understand each member has one vote and must participate in
                  annual meetings
                </span>
              </label>
            )}
          />
          <FieldErr errors={errors} name="votingDuty" />

          <div className="mt-4">
            <label className="block font-medium mb-1">Signature</label>
            <Input
              {...register("signature", { required: "Required" })}
            />
            <FieldErr errors={errors} name="signature" />
          </div>
        </section>

        {/* ---------- PAY ---------- */}
        <section className="pt-4">
          <p className="mb-4">
            Annual dues: <strong>$1.00</strong>{" "}
            {coupon && (
              <span className="text-green-600">
                (coupon <code>{coupon}</code> will apply)
              </span>
            )}
          </p>
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            Pay&nbsp;$1
          </Button>
        </section>
      </form>
    </main>
  );
}