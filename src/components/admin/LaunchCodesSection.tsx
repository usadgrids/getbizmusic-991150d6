import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Rocket, Star, CheckCircle2, Bell } from "lucide-react";
import {
  adminListLaunchCodes,
  adminUpdateLaunchCode,
  adminListClaims,
  markClaimAuditComplete,
} from "@/lib/launch-codes.functions";

/** Launch code redemption status + the business claims queue (priority first). */
export function LaunchCodesSection() {
  const listCodes = useServerFn(adminListLaunchCodes);
  const updateCode = useServerFn(adminUpdateLaunchCode);
  const listClaims = useServerFn(adminListClaims);

  const { data: codes = [], refetch } = useQuery({
    queryKey: ["admin-launch-codes"],
    queryFn: () => listCodes(),
  });
  const { data: claims = [], refetch: refetchClaims } = useQuery({
    queryKey: ["admin-claims"],
    queryFn: () => listClaims(),
  });

  const [busy, setBusy] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState<string | null>(null);

  async function patch(id: string, patchData: { isActive?: boolean; redemptionLimit?: number }) {
    setBusy(true);
    try {
      await updateCode({ data: { id, ...patchData } });
      toast.success("Priority Access Code updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const markComplete = useServerFn(markClaimAuditComplete);

  async function handleNotify(claimId: string) {
    const score = window.prompt("Enter the AI Visibility Score (e.g. 42/100), or leave blank:", "");
    if (score === null) return; // cancelled
    setNotifyBusy(claimId);
    try {
      await markComplete({ data: { claimId, auditScore: score || undefined } });
      toast.success("Owner notified — audit marked complete");
      refetchClaims();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notification failed");
    } finally {
      setNotifyBusy(null);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F2A4A]">
        <Rocket size={18} className="text-[#D4A24C]" /> Priority Access Code Status
      </h2>

      <div className="mt-4 grid gap-3">
        {codes.map((c) => {
          const pct = c.redemption_limit
            ? Math.min(100, Math.round((c.redemption_count / c.redemption_limit) * 100))
            : 0;
          return (
            <div key={c.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-[#0F2A4A]">{c.code}</p>
                  <p className="text-xs text-gray-600">
                    {c.redemption_count} of {c.redemption_limit} redeemed · locked price $
                    {Number(c.locked_price).toFixed(2)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    c.is_active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-gray-300 bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.is_active ? "Active" : "Deactivated"}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-[#D4A24C]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch(c.id, { isActive: !c.is_active })}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-[#0F2A4A] hover:bg-gray-50 disabled:opacity-60"
                >
                  {c.is_active ? "Deactivate now" : "Reactivate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const next = window.prompt("New redemption limit", String(c.redemption_limit));
                    const n = Number(next);
                    if (!next || Number.isNaN(n) || n < 0) return;
                    patch(c.id, { redemptionLimit: Math.floor(n) });
                  }}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-[#0F2A4A] hover:bg-gray-50 disabled:opacity-60"
                >
                  Change limit
                </button>
              </div>
            </div>
          );
        })}
        {codes.length === 0 && <p className="text-sm text-gray-500">No Priority Access Codes yet.</p>}
      </div>

      <h3 className="mt-8 text-base font-bold text-[#0F2A4A]">Business Claims Queue</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-3">Business</th>
              <th className="py-2 pr-3">Owner</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Priority Access Code</th>
              <th className="py-2 pr-3">Price</th>
              <th className="py-2 pr-3">Submitted</th>
              <th className="py-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-gray-100 ${c.priority ? "bg-[#FFF8E8]" : ""}`}
              >
                <td className="py-2 pr-3 font-semibold text-[#0F2A4A]">
                  <span className="inline-flex items-center gap-1.5">
                    {c.priority && (
                      <Star size={14} className="fill-[#D4A24C] text-[#D4A24C]" aria-label="Priority" />
                    )}
                    {c.business_name}
                  </span>
                  {c.founding_member && (
                    <span className="ml-2 rounded-full border border-[#D4A24C] px-2 py-0.5 text-[10px] font-bold uppercase text-[#7a5410]">
                      Founding 1,000
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-gray-700">
                  {c.owner_name}
                  <span className="block text-xs text-gray-500">{c.owner_email}</span>
                </td>
                <td className="py-2 pr-3 text-gray-700">{c.business_category ?? "—"}</td>
                <td className="py-2 pr-3 font-mono text-xs text-gray-700">
                  {c.launch_code_used ?? "—"}
                </td>
                <td className="py-2 pr-3 text-gray-700">
                  ${Number(c.locked_price ?? 49.95).toFixed(2)}/yr
                  {c.locked_price != null && (
                    <span className="block text-[10px] uppercase text-[#7a5410]">locked</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-500">
                  {new Date(c.submitted_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-sm text-gray-500">
                  No claims yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
