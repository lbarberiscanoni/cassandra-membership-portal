/* src/app/membership/page.jsx */
"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";

export default function Membership() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({ mode: "onBlur" });

  const router = useRouter();
  const searchParams = useSearchParams();
  const coupon = searchParams.get("coupon"); // "DUESPAID" for Prophet players
  const [step, setStep] = useState(1);
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  /* ---------- submit payload & launch Stripe ---------- */
  const onSubmit = async (data) => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ ...data, coupon }),
    });
    const { url } = await res.json();
    router.push(url); // go to Stripe Checkout
  };

  /* ---------- simple step tracker ---------- */
  const steps = useMemo(
    () => [
      { id: 1, label: "Identity" },
      { id: 2, label: "Mission" },
      { id: 3, label: "Participation" },
      { id: 4, label: "Meeting Prefs" },
      { id: 5, label: "Voting Duty" },
      { id: 6, label: "Review & Pay" },
    ],
    []
  );

  const current = steps.find((s) => s.id === step);

  /* ---------- render helpers ---------- */
  const Err = ({ name }) =>
    errors[name] ? (
      <span className="red-text text-darken-2 tiny">{errors[name].message}</span>
    ) : null;

  return (
    <main className="container" style={{ maxWidth: 640, paddingTop: 40 }}>
      <h4>Cassandra Membership Sign-up</h4>
      <p className="grey-text text-darken-1">
        Step {current.id} / {steps.length}: {current.label}
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ---------- STEP 1: IDENTITY ---------- */}
        {step === 1 && (
          <>
            <div className="input-field">
              <input
                {...register("name", { required: "Legal name required" })}
                id="name"
                type="text"
              />
              <label htmlFor="name">Legal Name</label>
              <Err name="name" />
            </div>
            <div className="input-field">
              <input
                {...register("email", {
                  required: "Email required",
                  pattern: {
                    value: /^\S+@\S+$/,
                    message: "Invalid email",
                  },
                })}
                id="email"
                type="email"
              />
              <label htmlFor="email">Email</label>
              <Err name="email" />
            </div>
            <div className="input-field">
              <input
                {...register("phone")}
                id="phone"
                type="tel"
              />
              <label htmlFor="phone">Phone (optional)</label>
            </div>
            <div className="input-field">
              <input
                {...register("address", { required: "Address required" })}
                id="address"
                type="text"
              />
              <label htmlFor="address">Physical Address</label>
              <Err name="address" />
            </div>

            <label>
              <input
                type="checkbox"
                {...register("isAdult", {
                  required: "You must confirm you are 18+",
                })}
              />
              <span>I am 18 years or older</span>
            </label>
            <br />
            <Err name="isAdult" />
          </>
        )}

        {/* ---------- STEP 2: MISSION AFFIRMATION ---------- */}
        {step === 2 && (
          <>
            <p>
              Cassandra Labs is a 501(c)(3) advancing open-source fintech
              research. By checking the box below you affirm that you support
              our charitable, educational, and scientific purposes.
            </p>
            <label>
              <input
                type="checkbox"
                {...register("mission", {
                  required: "Mission affirmation required",
                })}
              />
              <span>I support Cassandra’s mission</span>
            </label>
            <Err name="mission" />
          </>
        )}

        {/* ---------- STEP 3: PARTICIPATION AREAS ---------- */}
        {step === 3 && (
          <>
            <p>Select the areas you’re interested in (optional):</p>
            {["Research", "Open-source dev", "Volunteer committees"].map(
              (opt) => (
                <p key={opt}>
                  <label>
                    <input
                      type="checkbox"
                      value={opt}
                      {...register("participation")}
                    />
                    <span>{opt}</span>
                  </label>
                </p>
              )
            )}
          </>
        )}

        {/* ---------- STEP 4: MEETING PREFS ---------- */}
        {step === 4 && (
          <>
            <div className="input-field">
              <input
                {...register("timezone", { required: "Timezone required" })}
                id="tz"
                type="text"
              />
              <label htmlFor="tz">Preferred timezone (e.g. PST, UTC+1)</label>
              <Err name="timezone" />
            </div>
            <p>
              <label>
                <input
                  type="radio"
                  value="Live Zoom"
                  {...register("meetingPref", {
                    required: "Select a meeting format",
                  })}
                />
                <span>Live Zoom</span>
              </label>
            </p>
            <p>
              <label>
                <input
                  type="radio"
                  value="Watch recording"
                  {...register("meetingPref")}
                />
                <span>Recording OK</span>
              </label>
            </p>
            <Err name="meetingPref" />
          </>
        )}

        {/* ---------- STEP 5: VOTING DUTY + SIGNATURE ---------- */}
        {step === 5 && (
          <>
            <label>
              <input
                type="checkbox"
                {...register("votingDuty", {
                  required: "Acknowledgement required",
                })}
              />
              <span>
                I understand each member has one vote and a duty to participate
                in annual meetings.
              </span>
            </label>
            <Err name="votingDuty" />
            <div className="input-field">
              <input
                {...register("signature", { required: "Signature required" })}
                id="sig"
                type="text"
              />
              <label htmlFor="sig">Type your name as signature</label>
              <Err name="signature" />
            </div>
          </>
        )}

        {/* ---------- STEP 6: REVIEW & PAY ---------- */}
        {step === 6 && (
          <>
            <h5>Review</h5>
            <p>
              Annual dues: <strong>$1.00</strong>
              {coupon && (
                <span className="green-text text-darken-2">
                  {" "}
                  (coupon <code>{coupon}</code> will apply)
                </span>
              )}
            </p>
            <p>
              Click <em>Pay $1</em> to launch Stripe Checkout. You’ll be returned
              here afterward with your receipt.
            </p>
          </>
        )}

        {/* ---------- NAV BUTTONS ---------- */}
        <div style={{ marginTop: 32 }}>
          {step > 1 && (
            <button
              type="button"
              onClick={back}
              className="btn-flat grey lighten-3 black-text"
              style={{ marginRight: 12 }}
            >
              Back
            </button>
          )}

          {step < 6 && (
            <button
              type="button"
              onClick={() => {
                handleSubmit(() => next())();
              }}
              className="btn"
            >
              Next
            </button>
          )}

          {step === 6 && (
            <button type="submit" className="btn green">
              Pay $1
            </button>
          )}
        </div>
      </form>
    </main>
  );
}