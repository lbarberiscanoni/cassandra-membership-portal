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
      initiatives: []
    },
  });

  const router = useRouter();
  const coupon = useSearchParams().get("coupon");

  const onSubmit = async (data) => {
    console.log("🔥 onSubmit called with:", data);
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
      <h1 className="text-3xl font-semibold mb-6">
        Cassandra Membership Form
      </h1>
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

          {/* ---------- 2 · MISSION AFFIRMATION ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">2 Mission affirmation</h2>

            <Controller
              control={control}
              name="mission"
              rules={{ required: "Required" }}
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

            {[
              {
                label: "Research",
                tip: "Co-author papers, run experiments, peer-review drafts.",
              },
              {
                label: "Open-source dev",
                tip: "Contribute code, docs, or QA to Cassandra's public-goods repos.",
              },
              {
                label: "Volunteer committees",
                tip: "Help with outreach, compliance, grants, or events.",
              },
              {
                label: "Regular member",
                tip: "Stay informed and vote—no ongoing volunteer duties.",
              },
            ].map(({ label, tip }) => (
              <div key={label} className="flex items-center gap-2 mb-2">
                <Checkbox id={label} value={label} {...register("participation")} />
                <label htmlFor={label} className="font-medium">{label}</label>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-gray-400">&#9432;</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-sm">
                    {tip}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </section>


          {/* ---------- 4 · INITIATIVE INTERESTS ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">4 Initiative interests</h2>

            <p className="mb-4 text-sm text-gray-700">
              Select any initiatives you'd like to follow or contribute to. Clicking each
              will open details in a new tab.
            </p>

            {[
              {
                label: "LLM Briefing of Changes in Prediction Markets",
                url: null,
              },
              {
                label: "Charity Angeling for the Synapse Victims",
                url: "https://ringed-catsup-282.notion.site/Yotta-Summary-18223b3ffde080b68c4fe9364e2cfb21?pvs=74",
              },
              {
                label: "Cassandra Legal Apprenticeship Program",
                url: "https://ringed-catsup-282.notion.site/Legal-Apprenticeship-1da23b3ffde0808499f8c34311e1cac9?pvs=73",
              },
              {
                label: "Initial Litigation Offerings",
                url: "https://ringed-catsup-282.notion.site/Initial-Litigation-Offerings-4be9e2c37a8e440c8d6dfe1023bb75d4?pvs=74",
              },
              {
                label: "Impact Certificate Exchange",
                url: "https://ringed-catsup-282.notion.site/Impact-Certificate-Exchange-8b9ad891b8e5442daaf34838d81d8a71?pvs=74",
              },
              {
                label: "BUILD Fellowship for Immigrants of Extraordinary Ability",
                url: "https://cassandralabs.buildfellowship.com/",
              },
              {
                label: "Cassandra Journal with Replication Market instead of Peer Review",
                url: null,
              },
              {
                label: "Replication Markets (Prediction Markets for Scientific Replication)",
                url: "https://docs.google.com/document/d/11bCIUUy1WsThDB9CQBb4B0vWp0GeNgoJ/edit?usp=sharing&ouid=102842187037987242905&rtpof=true&sd=true",
              },
              {
                label: "Legal Wrappers for DAOs",
                url: "https://readwise.io/reader/shared/01hzgjexwsqb7n767n51t927a5/",
              },
              {
                label: "Native-American-Reservation-as-a-Service",
                url: "https://fortune.com/2022/07/06/crypto-regulation-tribal-land-catawba-nation-south-carolina-web-3/",
              },
              {
                label: "Donor-Advised Funds as a Service",
                url: "https://x.com/ankurnagpal/status/1818329134482780197",
              },
              {
                label: "Open-Source Banking-as-a-Service Platform",
                url: null,
              },
            ].map(({ label, url }) => (
              <div key={label} className="flex items-center gap-2 mb-2">
                <Checkbox id={label} value={label} {...register("initiatives")} />
                <label htmlFor={label} className="font-medium text-sm">{label}</label>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm underline ml-1 flex-shrink-0"
                  >
                    (details)
                  </a>
                )}
              </div>
            ))}
          </section>

          {/* ---------- 5 · CREDIT UNION INTEREST ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">5 Credit union interest (optional)</h2>

            <p className="mb-4 text-sm text-gray-700">
              Cassandra Labs is exploring establishing a federal credit union to serve our
              members. This section is optional but helps us understand member interest and
              needs.
            </p>

            <div className="mb-4">
              <label className="block font-medium mb-1">
                Would you be interested in joining a Cassandra credit union?
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
                    {[
                      "Savings account",
                      "Checking account",
                      "Vehicle loans",
                      "Mortgage loans",
                      "Credit cards",
                      "Business accounts",
                      "Other"
                    ].map((service) => (
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
                <Select defaultValue={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose how you'll attend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Live Zoom">Live Zoom</SelectItem>
                    <SelectItem value="Watch recording">Watch recording</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldErr errors={errors} name="meetingPref" />
          </section>

          {/* ---------- 7 · VOTING DUTY + SIGNATURE ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">
              7 Voting duty & signature
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
      </TooltipProvider>
    </main>
  );
}