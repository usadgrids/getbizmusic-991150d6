import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Trash2, Check, Link2, Plus, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { INDUSTRIES } from "@/lib/biz-utils";
import { getActiveCities } from "@/lib/cities.functions";
import {
  listActivationCodes,
  saveActivationCode,
  deleteActivationCode,
  markActivationPaid,
  setActivationStatus,
  setActivationChosenImage,
  resendActivationInvoice,
  type ActivationCodeRow,
} from "@/lib/activation.functions";

const STATUS_STYLES: Record<string, string> = {
  unused: "bg-gray-100 text-gray-700 border-gray-300",
  viewed: "bg-blue-100 text-blue-800 border-blue-300",
  awaiting_payment: "bg-amber-100 text-amber-800 border-amber-300",
  awaiting_manual: "bg-purple-100 text-purple-800 border-purple-300",
  billed: "bg-orange-100 text-orange-800 border-orange-300",
  awaiting_artwork: "bg-yellow-100 text-yellow-800 border-yellow-300",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
  deactivated: "bg-gray-200 text-gray-500 border-gray-300",
};

export function ActivationCodesSection() {
  const listFn = useServerFn(listActivationCodes);
  const saveFn = useServerFn(saveActivationCode);
  const deleteFn = useServerFn(deleteActivationCode);
  const paidFn = useServerFn(markActivationPaid);
  const statusFn = useServerFn(setActivationStatus);
  const chosenFn = useServerFn(setActivationChosenImage);
  const invoiceFn = useServerFn(resendActivationInvoice);
  const citiesFn = useServerFn(getActiveCities);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["activation-codes"],
    queryFn: () => listFn(),
  });
  const { data: cities = [] } = useQuery({
    queryKey: ["active-cities-activation"],
    queryFn: () => citiesFn(),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ActivationCodeRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (r: ActivationCodeRow) => { setEditing(r); setShowForm(true); };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("image") as File | null;
    setBusy(true);
    try {
      let imagePath = editing?.image_path ?? "";
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `activation/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("ad-uploads")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        imagePath = path;
      }
      if (!imagePath) throw new Error("Please upload the ad image the customer will review.");

      const priceDollars = Number(fd.get("price") ?? 0);
      const res = await saveFn({
        data: {
          id: editing?.id,
          code: String(fd.get("code") ?? ""),
          businessName: String(fd.get("business_name") ?? ""),
          industry: String(fd.get("industry") ?? ""),
          tagline: String(fd.get("tagline") ?? ""),
          cityId: (String(fd.get("city_id") ?? "") || null) as string | null,
          websiteUrl: String(fd.get("website_url") ?? ""),
          youtubeUrl: String(fd.get("youtube_url") ?? ""),
          imagePath,
          adType: (String(fd.get("ad_type") ?? "slider_10") as "image_5" | "slider_10"),
          priceCents: Math.round(priceDollars * 100),
          priceNote: String(fd.get("price_note") ?? ""),
          contactName: String(fd.get("contact_name") ?? ""),
          businessAddress: String(fd.get("business_address") ?? ""),
          contactEmail: String(fd.get("contact_email") ?? ""),
          phoneVoice: String(fd.get("phone_voice") ?? ""),
          phoneSms: String(fd.get("phone_sms") ?? ""),
          expiresAt: (String(fd.get("expires_at") ?? "") || null) as string | null,
        },
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(editing ? "Activation code updated" : "Activation code created");
      setShowForm(false);
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: ActivationCodeRow) => {
    if (!confirm(`Delete activation code "${r.code}" for ${r.business_name}? This cannot be undone.`)) return;
    const res = await deleteFn({ data: { id: r.id } });
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success("Deleted");
    refetch();
  };

  const confirmPaid = async (r: ActivationCodeRow) => {
    if (!confirm(`Confirm you received payment for "${r.code}"? This sends the receipt email.`)) return;
    const res = await paidFn({ data: { id: r.id } });
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success("Marked paid — receipt sent");
    refetch();
  };

  const chooseImage = async (r: ActivationCodeRow, chosen: "ours" | "customer") => {
    const res = await chosenFn({ data: { id: r.id, chosen } });
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success(chosen === "ours" ? "Using our design" : "Using customer artwork");
    refetch();
  };

  const resendInvoice = async (r: ActivationCodeRow) => {
    if (!confirm(`Resend the invoice email for "${r.code}"?`)) return;
    const res = await invoiceFn({ data: { id: r.id } });
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success("Invoice email sent");
  };

  const toggleActive = async (r: ActivationCodeRow) => {
    const next = r.status === "deactivated" ? "unused" : "deactivated";
    const res = await statusFn({ data: { id: r.id, status: next } });
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success(next === "deactivated" ? "Code deactivated" : "Code re-activated");
    refetch();
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <KeyRound size={18} className="text-[#D4A24C]" />
        <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">Activation Codes ({rows.length})</h2>
        <button onClick={openNew} className="ml-auto text-xs bg-[#0F2A4A] text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-[#163864]">
          <Plus size={12} /> New code
        </button>
        <button onClick={() => refetch()} className="text-xs text-[#0F2A4A] hover:underline">Refresh</button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="md:col-span-2 flex items-center justify-between">
            <h3 className="font-semibold text-[#0F2A4A]">{editing ? `Edit ${editing.code}` : "New activation code"}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <Input name="code" label="Activation code" defaultValue={editing?.code} required placeholder="AMLEGAL49" />
          <Input name="business_name" label="Business name" defaultValue={editing?.business_name} required />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Business category *</span>
            <select name="industry" defaultValue={editing?.industry ?? ""} required className={inputCls}>
              <option value="" disabled>Select…</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">City</span>
            <select name="city_id" defaultValue={editing?.city_id ?? ""} className={inputCls}>
              <option value="">— None —</option>
              {cities.map((c: { id: string; name: string; state: string }) => (
                <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
              ))}
            </select>
          </label>
          <Input name="tagline" label="Tagline" defaultValue={editing?.tagline ?? ""} />
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Ad type</span>
            <select name="ad_type" defaultValue={editing?.ad_type ?? "slider_10"} className={inputCls}>
              <option value="slider_10">Featured Slider — 10s</option>
              <option value="image_5">Standard Image — 7s</option>
            </select>
          </label>
          <Input name="website_url" label="Website URL" defaultValue={editing?.website_url ?? ""} />
          <Input name="youtube_url" label="YouTube URL" defaultValue={editing?.youtube_url ?? ""} />
          <Input name="price" label="Price (USD)" type="number" step="0.01" defaultValue={editing ? (editing.price_cents / 100).toFixed(2) : "48.00"} required />
          <Input name="price_note" label="Price note (e.g. 50% rep discount applied)" defaultValue={editing?.price_note ?? ""} />
          <Input name="contact_name" label="Contact name" defaultValue={editing?.contact_name ?? ""} />
          <Input name="business_address" label="Business address" defaultValue={editing?.business_address ?? ""} />
          <Input name="contact_email" label="Customer support email" type="email" defaultValue={editing?.contact_email ?? ""} />
          <Input name="phone_voice" label="Support number (voice)" defaultValue={editing?.phone_voice ?? ""} />
          <Input name="phone_sms" label="Support number (text/SMS)" defaultValue={editing?.phone_sms ?? ""} />
          <Input name="expires_at" label="Expires (optional)" type="date" defaultValue={editing?.expires_at ? editing.expires_at.slice(0, 10) : ""} />
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-gray-600">
              Ad image {editing ? "(leave empty to keep current)" : "*"}
            </span>
            <input type="file" name="image" accept="image/*" className="mt-1 w-full text-xs" />
            {editing?.image_url && (
              <img src={editing.image_url} alt="Current proof" className="mt-2 h-28 rounded border border-gray-200" />
            )}
          </label>
          <div className="md:col-span-2">
            <button type="submit" disabled={busy} className="bg-[#D4A24C] text-[#0F2A4A] font-bold px-5 py-2 rounded-lg hover:bg-[#e0b266] disabled:opacity-60">
              {busy ? "Saving…" : editing ? "Save changes" : "Create code"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No activation codes yet. Create one, then share the link with the business.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Business</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Artwork</th>
                  <th className="px-4 py-2">Customer response</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const isOpen = expanded === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="align-top">
                        <td className="px-4 py-3 font-mono font-bold text-[#0F2A4A]">{r.code}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#0F2A4A]">{r.customer_business_name || r.business_name}</div>
                          <div className="text-xs text-gray-500">{r.customer_email || r.contact_email || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">${(r.price_cents / 100).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 border rounded-full ${STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                          {r.memo_code && <div className="text-[10px] font-mono text-gray-500 mt-1">Memo: {r.memo_code}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-semibold text-[#0F2A4A]">
                            {r.artwork_choice === "customer"
                              ? "Customer upload"
                              : r.artwork_choice === "later"
                                ? "Sending later"
                                : "Our design"}
                          </div>
                          {r.customer_image_url && (
                            <a href={r.customer_image_url} target="_blank" rel="noreferrer" className="text-[#0F2A4A] hover:underline">
                              View upload
                            </a>
                          )}
                          {r.customer_image_path && (
                            <div className="mt-1 flex gap-1">
                              <button
                                onClick={() => chooseImage(r, "ours")}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${r.chosen_image === "ours" ? "bg-[#0F2A4A] text-white border-[#0F2A4A]" : "border-gray-300 text-gray-600"}`}
                              >
                                Use ours
                              </button>
                              <button
                                onClick={() => chooseImage(r, "customer")}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${r.chosen_image === "customer" ? "bg-[#0F2A4A] text-white border-[#0F2A4A]" : "border-gray-300 text-gray-600"}`}
                              >
                                Use theirs
                              </button>
                            </div>
                          )}
                          {r.artwork_choice === "later" && !r.customer_image_path && (
                            <button
                              onClick={() => {
                                void navigator.clipboard.writeText(r.upload_url);
                                toast.success("Upload link copied");
                              }}
                              className="block text-[#0F2A4A] hover:underline mt-1"
                            >
                              Copy upload link
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.confirmed_correct === null ? (
                            <span className="text-gray-400">Not reviewed yet</span>
                          ) : r.confirmed_correct ? (
                            <span className="text-emerald-700 font-semibold">Approved as-is</span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Corrections requested</span>
                          )}
                          {r.correction_notes && (
                            <button onClick={() => setExpanded(isOpen ? null : r.id)} className="block text-[#0F2A4A] hover:underline mt-1">
                              {isOpen ? "Hide notes" : "View notes"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => {
                                void navigator.clipboard.writeText(r.share_url);
                                toast.success("Activation link copied");
                              }}
                              className="text-[11px] text-[#0F2A4A] hover:underline inline-flex items-center gap-1"
                            >
                              <Link2 size={11} /> Copy link
                            </button>
                            <button onClick={() => openEdit(r)} className="text-[11px] text-[#0F2A4A] hover:underline inline-flex items-center gap-1">
                              <Pencil size={11} /> Edit
                            </button>
                            {r.status !== "paid" && (
                              <button onClick={() => confirmPaid(r)} className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2 py-1 rounded inline-flex items-center gap-1 justify-center">
                                <Check size={11} /> Mark paid
                              </button>
                            )}
                            {r.status === "billed" && (
                              <button onClick={() => resendInvoice(r)} className="text-[11px] text-orange-700 hover:underline">
                                Resend invoice
                              </button>
                            )}
                            <button onClick={() => toggleActive(r)} className="text-[11px] text-gray-600 hover:underline">
                              {r.status === "deactivated" ? "Re-activate" : "Deactivate"}
                            </button>
                            <button onClick={() => remove(r)} className="text-[11px] text-red-600 hover:text-red-700 inline-flex items-center gap-1">
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="px-4 py-3 text-xs text-gray-700 whitespace-pre-wrap">
                            <strong className="text-[#0F2A4A]">Customer notes:</strong>
                            <div className="mt-1">{r.correction_notes}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const inputCls = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]";

function Input({
  name, label, defaultValue, required, type = "text", placeholder, step,
}: { name: string; label: string; defaultValue?: string | null; required?: boolean; type?: string; placeholder?: string; step?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600">{label}{required && " *"}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className={inputCls}
      />
    </label>
  );
}
