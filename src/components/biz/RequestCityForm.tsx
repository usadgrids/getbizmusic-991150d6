import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitCityRequest } from "@/lib/cities.functions";

type Props = {
  city: string;
  stateCode: string;
  zip: string;
};

export function RequestCityForm({ city, stateCode, zip }: Props) {
  const submit = useServerFn(submitCityRequest);
  const [form, setForm] = useState({
    city_name: city,
    state: stateCode,
    zip,
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.city_name.trim() || !form.state.trim() || !/^\d{5}$/.test(form.zip.trim())) {
      setError("Please fill in city, state, and a valid 5-digit ZIP.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          city_name: form.city_name.trim(),
          state: form.state.trim(),
          zip: form.zip.trim(),
          email: form.email.trim(),
          message: form.message.trim() || undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-2xl font-bold text-[#0F2A4A]">Request received — thank you!</h3>
        <p className="mt-3 text-gray-600 max-w-lg mx-auto">
          We'll email <span className="font-semibold">{form.email}</span> as soon as Get Biz Music launches in{" "}
          <span className="font-semibold">{form.city_name}, {form.state}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <h3 className="text-xl sm:text-2xl font-bold text-[#0F2A4A]">
        We're not in {city}, {stateCode} yet
      </h3>
      <p className="mt-2 text-gray-600">
        Be the first novelty advertiser to request Get Biz Music in your ZIP code. We'll email you the moment it launches.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-1">
          <span className="text-sm font-semibold text-gray-700">City</span>
          <input
            type="text"
            required
            maxLength={120}
            value={form.city_name}
            onChange={(e) => setForm((f) => ({ ...f, city_name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">State</span>
          <input
            type="text"
            required
            maxLength={2}
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">ZIP code</span>
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={form.zip}
            onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Email <span className="text-red-500">*</span></span>
          <input
            type="email"
            required
            maxLength={200}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-gray-700">Message <span className="text-gray-400 font-normal">(optional)</span></span>
          <textarea
            maxLength={500}
            rows={3}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tell us about your business or neighborhood…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFB300]"
          />
        </label>

        {error && (
          <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto rounded-full bg-[#FFB300] hover:bg-[#FFC533] text-[#0F2A4A] font-bold px-6 py-3 transition-colors disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Request this city"}
          </button>
        </div>
      </form>
    </div>
  );
}
