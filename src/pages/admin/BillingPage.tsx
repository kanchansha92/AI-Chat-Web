import { useEffect, useState } from "react";
import {
  adminService,
  type AdminSubscription,
  type AdminPayment,
  type AdminWebhookEvent,
} from "../../services/adminService";
import { formatPaise, formatDate } from "../../services/billingService";
import { Modal, Toast } from "./ui";

// Billing, for support.
//
// Read-only with one exception: a refund, which calls the provider and is
// recorded on the payment. There is deliberately no way here to edit or delete
// a payment, a credit transaction or a plan change - financial history is
// append-only, admins included.

type Tab = "subscriptions" | "payments" | "webhooks";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TRIALING: "bg-sky-50 text-sky-700 border-sky-200",
  PAST_DUE: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-slate-50 text-slate-600 border-slate-200",
  EXPIRED: "bg-slate-50 text-slate-500 border-slate-200",
  INCOMPLETE: "bg-slate-50 text-slate-500 border-slate-200",
  PAUSED: "bg-slate-50 text-slate-600 border-slate-200",
  CAPTURED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  REFUNDED: "bg-slate-100 text-slate-600 border-slate-200",
  PARTIALLY_REFUNDED: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IGNORED: "bg-slate-50 text-slate-500 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
};

function Pill({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        STATUS_TONE[value] ?? "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {value.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [subs, setSubs] = useState<AdminSubscription[] | null>(null);
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [events, setEvents] = useState<AdminWebhookEvent[] | null>(null);
  const [q, setQ] = useState("");
  const [refunding, setRefunding] = useState<AdminPayment | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setError(null);
    if (tab === "subscriptions") {
      adminService
        .subscriptions({ q: q || undefined })
        .then((r) => setSubs(r.subscriptions))
        .catch((e) => setError(e.message));
    } else if (tab === "payments") {
      adminService
        .payments({ q: q || undefined })
        .then((r) => setPayments(r.payments))
        .catch((e) => setError(e.message));
    } else {
      adminService
        .webhooks()
        .then((r) => setEvents(r.events))
        .catch((e) => setError(e.message));
    }
  }

  useEffect(load, [tab, q]);

  async function refund() {
    if (!refunding || !refundNote.trim() || busy) return;
    setBusy(true);
    try {
      await adminService.refundPayment(refunding.id, refundNote.trim());
      setToast("Refunded.");
      setRefunding(null);
      setRefundNote("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Subscriptions, payments and provider events. Read-only, apart from refunds.
          </p>
        </div>
      </header>

      <div className="mt-5 flex items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(["subscriptions", "payments", "webhooks"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab !== "webhooks" && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search by name, email or provider id"
            className="flex-1 max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-400"
          />
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {tab === "subscriptions" && (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Period ends</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Failures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(subs ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2">
                    <div className="text-slate-800">{s.user?.name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{s.user?.email}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {s.plan} · {s.cycle === "ANNUAL" ? "yearly" : "monthly"}
                    {s.cancelAtPeriodEnd && <span className="ml-1 text-xs text-amber-600">(ending)</span>}
                  </td>
                  <td className="px-4 py-2">
                    <Pill value={s.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.status === "TRIALING" ? formatDate(s.trialEndsAt) : formatDate(s.currentPeriodEnd)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.paymentMethodType === "NONE" ? "—" : s.paymentMethodType.toLowerCase()}
                    {s.paymentMethodLast4 ? ` ····${s.paymentMethodLast4}` : ""}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{s.renewalFailedCount || "—"}</td>
                </tr>
              ))}
              {subs && subs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No subscriptions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "payments" && (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">For</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2">
                    <div className="text-slate-800">{p.user?.name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{p.user?.email}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {p.kind === "CREDIT_PACK" ? `${p.creditsGranted ?? ""} credits` : `${p.plan ?? ""} ${p.cycle ?? ""}`}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {formatPaise(p.amountPaise)}
                    {p.refundedPaise > 0 && (
                      <span className="block text-xs text-slate-500">−{formatPaise(p.refundedPaise)} refunded</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Pill value={p.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    {["CAPTURED", "PARTIALLY_REFUNDED"].includes(p.status) && (
                      <button
                        type="button"
                        onClick={() => setRefunding(p)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments && payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No payments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "webhooks" && (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Attempts</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(events ?? []).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2">
                    <div className="text-slate-800">{e.eventType}</div>
                    <div className="text-xs text-slate-400 font-mono">{e.eventId.slice(0, 22)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Pill value={e.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">{e.attempts}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(e.receivedAt)}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{e.error ?? "—"}</td>
                </tr>
              ))}
              {events && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={Boolean(refunding)}
        title="Refund this payment?"
        confirmLabel={busy ? "Refunding…" : "Refund"}
        busy={busy || !refundNote.trim()}
        onConfirm={refund}
        onCancel={() => {
          setRefunding(null);
          setRefundNote("");
        }}
      >
        {refunding && (
          <>
            <p className="text-sm text-slate-600">
            {formatPaise(refunding.amountPaise - refunding.refundedPaise)} will be refunded through Razorpay.
              {refunding.kind === "CREDIT_PACK" &&
                " Unspent credits from this pack are clawed back — never below zero."}
            </p>
            <label className="mt-4 block text-sm text-slate-600">
              Why? (recorded against the refund)
              <input
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400"
                placeholder="customer request, duplicate charge…"
              />
            </label>
          </>
        )}
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
