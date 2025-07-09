"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";

/* ---------- tiny helper ---------- */
function FieldError({ errors, name }) {
  return errors[name] ? (
    <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
  ) : null;
}

export default function Membership() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  const router = useRouter();
  const searchParams = useSearchParams();
  const coupon = searchParams.get("coupon");
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const onSubmit = async (data) => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ ...data, coupon }),
    });
    const { url } = await res.json();
    router.push(url);
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-semibold mb-8">
        Cassandra Membership Sign-up
      </h1>

      <p className="text-gray-500 mb-6">Step {step} / 6</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ---------------- STEP 1 ---------------- */}
        {step === 1 && (
          <>
            <div className="mb-4">
              <label className="block font-medium mb-1">Legal name</label>
              <input
                {...register("name", { required: "Legal name required" })}
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <FieldError errors={errors} name="name" />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">Email</label>
              <input
                {...register("email", {
                  required: "Email required",
                  pattern: { value: /^\S+@\S+$/, message: "Invalid email" },
                })}
                type="email"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <FieldError errors={errors} name="email" />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">Phone (optional)</label>
              <input
                {...register("phone")}
                type="tel"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">Physical address</label>
              <input
                {...register("address", { required: "Address required" })}
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <FieldError errors={errors} name="address" />
            </div>

            <label className="flex items-center mb-6 space-x-2">
              <input
                type="checkbox"
                {...register("isAdult", { required: "Required" })}
              />
              <span>I am 18 years or older</span>
            </label>
            <FieldError errors={errors} name="isAdult" />
          </>
        )}

        {/* ------- keep the remaining steps exactly as before ------- */}
        {/* …… STEP 2 through STEP 6 code unchanged …… */}

        {/* ---------------- NAV BUTTONS ---------------- */}
        <div className="mt-8 flex justify-between">
          {step > 1 && (
            <button
              type="button"
              onClick={back}
              className="rounded border border-gray-400 px-4 py-2"
            >
              Back
            </button>
          )}

          {step < 6 && (
            <button
              type="button"
              onClick={() => handleSubmit(() => next())()}
              className="ml-auto rounded bg-blue-600 px-6 py-2 text-white"
            >
              Next
            </button>
          )}

          {step === 6 && (
            <button
              type="submit"
              className="ml-auto rounded bg-green-600 px-6 py-2 text-white"
            >
              Pay $1
            </button>
          )}
        </div>
      </form>
    </main>
  );
}