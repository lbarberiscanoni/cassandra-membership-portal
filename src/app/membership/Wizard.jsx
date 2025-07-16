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
      meetingPref: "Watch recording",   // ← new line
      board_choice:  "David",  // you already have
      bylaws_yesno:  "yes",
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
            <h2 className="text-xl font-medium mb-4">2 Mission affirmation</h2>

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
            <h2 className="text-xl font-medium mb-2">3 Participation areas</h2>

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
                tip: "Contribute code, docs, or QA to Cassandra’s public-goods repos.",
              },
              {
                label: "Volunteer committees",
                tip: "Help with outreach, compliance, grants, or events.",
              },
              {
                label: "Regular member",            // ← new option
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


          {/* ---------- 4 · MEETING PREFS ---------- */}
          <section>
            <h2 className="text-xl font-medium mb-4">4 Meeting preferences</h2>

            {/* dropdown with Watch recording pre-selected */}
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

            {/* call-out box for When2Meet */}
            <div className="mt-6 border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-800">
                <strong>Help us schedule!</strong>  Mark the times you
                could attend the Zoom in our&nbsp;
                <a
                  href="https://www.when2meet.com/?31336517-jnq1K"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline text-blue-700"
                >
                  When2Meet poll
                </a>
                . (This takes 30 seconds and really boosts turnout.)
              </p>
            </div>
          </section>

          {/* ---------- 5 · NOMINATIONS & AGENDA ---------- */}
          <section className="pt-6">
            <h2 className="text-xl font-medium mb-4">
              5 Remote Voting &amp; Agenda Ideas
            </h2>



            {/* nominate someone else */}
            <div className="mb-4">
              <label className="block font-medium mb-1">
                Vote on a Member Liason to represent you
              </label>
              <Controller
                control={control}
                name="board_choice"
                defaultValue="David"
                rules={{ required: true }}
                render={({ field }) => (
                  <>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-3"
                    >
                      {/* Option 1 — David */}
                      <label className="flex items-start gap-2">
                        <RadioGroupItem value="David" id="david" />
                        <span>
                          <strong>David Moore</strong>
                          <p className="mt-1 text-gray-600 text-xs leading-snug">
                            “As Member Liaison, I’ll be the bridge between our growing community and Cassandra’s mission to build public-good infrastructure—from open-source prediction markets to fintech tools that widen access to finance. I thrive on greeting new members, turning our charitable, educational, and scientific goals into clear first steps, and following through until everyone feels heard. When feedback rolls in, I act fast—updating docs, scheduling live Q&As, and looping in the right experts—so momentum never stalls. Empowering volunteers to contribute their best work isn’t a side task for me; it’s how I’ll keep Cassandra’s Association vibrant and moving forward.'”
                          </p>
                        </span>
                      </label>

                      {/* Option 2 — Write-in */}
                      <label className="flex items-start gap-2">
                        <RadioGroupItem value="write-in" id="writein" />
                        <span>Write-in candidate</span>
                      </label>
                    </RadioGroup>

                    {/* Conditional text box shows only if “write-in” selected */}
                    {watch("board_choice") === "write-in" && (
                      <Input
                        className="mt-2"
                        placeholder="Type full name"
                        {...register("write_in", { required: "Name required" })}
                      />
                    )}
                  </>
                )}
              />
              <FieldErr errors={errors} name="write_in" />
            </div>

            {/* by-laws yes/no */}
            <div className="mt-6">
              <label className="block font-medium mb-1">
                Ratify&nbsp;
                <a
                  href="https://docs.google.com/document/d/1klc3TzxREA3fRNKFsFj29u6gjFHXAOKUM8-OnpxY1Dw/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  revised by-laws
                </a>
                ?
              </label>

              <Controller
                control={control}
                name="bylaws_yesno"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select defaultValue={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes – adopt</SelectItem>
                      <SelectItem value="no">No – reject</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldErr errors={errors} name="bylaws_yesno" />
            </div>

            {/* ranked-choice agenda poll */}
            <div className="mt-6 border-l-4 border-indigo-500 bg-indigo-50 p-4 rounded">
              <p className="text-sm">
                <strong>Help prioritize our 2025 research projects&nbsp;→</strong>&nbsp;
                Cast your ranked-choice vote in the&nbsp;
                <a
                  href="https://rankedchoices.com/cassandragenda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-700 font-medium"
                >
                  Agenda Poll
                </a>
                . No login required—takes about 30&nbsp;seconds.
              </p>
            </div>

            {/* questions for the founders */}
            <div className="mt-6">
              <label className="block font-medium mb-1">
                Questions for Jacob &amp; Lorenzo (optional)
              </label>
              <Textarea
                rows={3}
                placeholder="Ask us anything about Cassandra. We'll answer in the Q&A"
                {...register("member_questions")}
              />
            </div>  

            {/* agenda / motions */}
            <div>
              <label className="block font-medium mb-1">
                Agenda items or motions you’d like to propose (optional)
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
              6 Voting duty & signature
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