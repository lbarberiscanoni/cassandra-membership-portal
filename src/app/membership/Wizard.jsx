/* src/app/membership/Wizard.jsx */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import AddressInput from "@/components/AddressInput";
import {
  CREDIT_UNION_SERVICES,
  MEETING_PREFERENCES,
  PARTICIPATION_OPTIONS,
  RESEARCH_AGENDA_POLL_URL,
} from "@/lib/membershipOptions";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
    watch,        
    formState: { errors },
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      meetingPref: "Watch recording",
      participation: ["Regular member"],
      creditUnionInterest: "",
      creditUnionServices: [],
    },
  });

  const router = useRouter();
  const coupon = useSearchParams().get("coupon");

  const onSubmit = async (data) => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, coupon }),
      });

      const body = await res.json();

      if (!res.ok) {
        alert("Signup failed: " + (body.error || "unknown error"));
        return;
      }

      // during testing, body.url may be undefined—so default to /thanks
      const redirectUrl = body.url ?? "/thanks";
      router.push(redirectUrl);
    } catch (err) {
      console.error(err);
      alert("Network error: " + err.message);
    }
  };



  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-semibold mb-2">
        Cassandra Membership Form
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Already a member?{" "}
        <a href="/login" className="text-blue-600 underline">
          Log in
        </a>{" "}
        to manage your profile or pay your dues.
      </p>
      <TooltipProvider delayDuration={250}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* ---------- 1 · IDENTITY ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">1 Identity</h2>

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

            {/* Physical address */}
            <div className="mb-4">
              <label className="block font-medium mb-1">Physical address</label>
              <Controller
                control={control}
                name="streetAddress"
                rules={{ required: "Required" }}
                render={({ field }) => <AddressInput field={field} />}
              />
              <FieldErr errors={errors} name="streetAddress" />
            </div>

            <Controller
              control={control}
              name="isAdult"
              rules={{ validate: (value) => value === true || "Required" }}
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

          {/* ---------- 2 · MISSION AFFIRMATION ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">2 Mission affirmation</h2>

            <Controller
              control={control}
              name="mission"
              rules={{ validate: (value) => value === true || "Required" }}
              render={({ field }) => (
                <label className="inline-flex items-start gap-2">
                  <Checkbox
                    id="mission"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  <span>
                    I have read and support the&nbsp;
                    <a
                      href="https://cassandralabs.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Cassandra Labs mission
                    </a>
                    .
                    <p className="mt-1 text-xs text-gray-600">
                      <strong>By-laws&nbsp;Art.&nbsp;I § 1&nbsp;&amp;&nbsp;§ 2&nbsp;excerpt:</strong><br />
                      Cassandra Labs is organized exclusively for charitable, educational,
                      and scientific purposes within the meaning of&nbsp;§ 501(c)(3) of the
                      Internal Revenue Code, including making distributions to qualified
                      organizations. To advance these purposes, Cassandra Labs may design,
                      build, and steward public-goods infrastructure that harnesses
                      collective intelligence and conduct mechanism-design research for the
                      benefit of its Members and the public — all in compliance with
                      § 501(c)(3) and other applicable law.
                    </p>
                  </span>
                </label>
              )}
            />
            <FieldErr errors={errors} name="mission" />
          </section>

          {/* ---------- 3 · PARTICIPATION ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-2">3 Participation areas</h2>

            <p className="mb-4 text-sm text-gray-700">
              Pick any ways you might like to get involved—nothing is binding, it just
              helps us send the right invitations and resources.
            </p>

            <Controller
              control={control}
              name="participation"
              render={({ field }) => (
                <>
                  {PARTICIPATION_OPTIONS.map(({ label, tip }) => {
                    const checked = (field.value || []).includes(label);
                    const id = `participation-${label}`;

                    return (
                      <div key={label} className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            const current = field.value || [];
                            field.onChange(
                              isChecked
                                ? [...current, label]
                                : current.filter((value) => value !== label)
                            );
                          }}
                        />
                        <label htmlFor={id} className="font-medium">
                          {label}
                        </label>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-gray-400">&#9432;</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">
                            {tip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </>
              )}
            />
          </section>


          {/* ---------- 4 · RESEARCH AGENDA ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">
              4 Research agenda ranking
            </h2>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-medium text-blue-950">
                Rank the 2026 research and public-goods agenda
              </h3>
              <p className="mt-1 text-sm text-blue-900">
                Use the external ranked-choice ballot to drag the six research areas
                into your preferred order. This is the only place your ranking is
                recorded. No account is required.
              </p>
              <a
                href={RESEARCH_AGENDA_POLL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block font-medium text-blue-700 underline"
              >
                Open the ranked-choice ballot →
              </a>
            </div>
          </section>

          {/* ---------- 5 · CREDIT UNION INTEREST ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">
              5 Pynthia Credit Union interest (optional)
            </h2>

            <p className="mb-4 text-sm text-gray-700">
              Cassandra Labs expects to be an associational group in the proposed Pynthia
              Credit Union, a California state-chartered credit union being organized to
              serve its members. This section is optional but helps us understand member
              interest and needs.
            </p>

            <p className="mb-4 text-sm">
              <a
                href="https://ringed-catsup-282.notion.site/Pynthia-The-Million-Dollar-Wall-31123b3ffde080a9a884fffe2916fc32?pvs=74"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 underline"
              >
                Learn more: Pynthia — The Million-Dollar Wall →
              </a>
            </p>

            <div className="mb-4">
              <label className="block font-medium mb-1">
                Would you be interested in joining Pynthia Credit Union?
              </label>
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

            {(watch("creditUnionInterest") === "yes" || watch("creditUnionInterest") === "maybe") && (
              <>
                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    What products/services would you need? (select all that apply)
                  </label>
                  <div className="space-y-2 mt-2">
                    {CREDIT_UNION_SERVICES.map((service) => (
                      <div key={service} className="flex items-center gap-2">
                        <Checkbox
                          id={service}
                          value={service}
                          {...register("creditUnionServices")}
                        />
                        <label htmlFor={service} className="text-sm">{service}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Estimated initial deposit (optional)
                  </label>
                  <Input
                    type="number"
                    placeholder="$"
                    {...register("initialDeposit")}
                  />
                </div>

                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    Expected monthly deposits (optional)
                  </label>
                  <Input
                    type="number"
                    placeholder="$"
                    {...register("monthlyDeposit")}
                  />
                </div>

                <div className="mb-4">
                  <label className="block font-medium mb-1">
                    What's your most important need from a credit union?
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Your top priority..."
                    {...register("creditUnionPriority")}
                  />
                </div>
              </>
            )}
          </section>


          {/* ---------- 6 · MEETING PREFS ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">6 Meeting preferences</h2>

            <p className="mb-4 text-sm text-gray-700">
              We have a yearly meeting and quarterly presentations.
            </p>

            <Controller
              control={control}
              name="meetingPref"
              rules={{ required: "Required" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose your preferred format" />
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
            <FieldErr errors={errors} name="meetingPref" />
          </section>

          {/* ---------- 7 · VOTING DUTY + SIGNATURE ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">
              7 Membership acknowledgments & signature
            </h2>

            <Controller
              control={control}
              name="votingDuty"
              rules={{ validate: (value) => value === true || "Required" }}
              render={({ field }) => (
                <label className="inline-flex items-center gap-2 mb-2">
                  <Checkbox
                    id="votingDuty"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  <span>
                    I understand each member has one vote and must participate in at
                    least one mission-related activity each year.
                  </span>
                </label>
              )}
            />
            <FieldErr errors={errors} name="votingDuty" />

            <Controller
              control={control}
              name="bylaws"
              rules={{ validate: (value) => value === true || "Required" }}
              render={({ field }) => (
                <label className="inline-flex items-start gap-2 mt-4">
                  <Checkbox
                    id="bylaws"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  <span>
                    I have read and agree to the&nbsp;
                    <a
                      href="https://cassandra-labs.gitbook.io/cassandra-governance/bylaws"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Cassandra by-laws
                    </a>
                    .
                  </span>
                </label>
              )}
            />
            <FieldErr errors={errors} name="bylaws" />

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
      </TooltipProvider>
    </main>
  );
}
