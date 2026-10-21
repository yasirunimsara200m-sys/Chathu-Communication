"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";
import {
  Wallet,
  DollarSign,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

type DayIncome = {
  totalRevenue: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  billCount: number;
};

type Current = {
  session: null | {
    id: string;
    openingFloat: number;
    openedAt: string;
    openedBy: { name: string };
  };
  expectedCash: number;
  cashSales?: number;
  dayIncome?: DayIncome;
};

type Closed = {
  id: string;
  openingFloat: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  notes?: string | null;
  openedAt: string;
  closedAt: string;
  openedBy: { name: string };
  closedBy?: { name: string } | null;
};

export default function DrawerPage() {
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<Closed[]>([]);
  const [floatAmt, setFloatAmt] = useState("5000");
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [closed, setClosed] = useState<Closed | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, h] = await Promise.all([
      api<Current>("/api/drawer/current"),
      api<Closed[]>("/api/drawer/history"),
    ]);
    setCurrent(c);
    setHistory(h);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function openDrawer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/drawer/open", {
        method: "POST",
        body: JSON.stringify({ openingFloat: Number(floatAmt) }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open drawer");
    } finally {
      setBusy(false);
    }
  }

  async function closeDrawer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const row = await api<Closed>("/api/drawer/close", {
        method: "POST",
        body: JSON.stringify({ actualCash: Number(counted), notes }),
      });
      setClosed(row);
      setCounted("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close drawer");
    } finally {
      setBusy(false);
    }
  }

  const countedNum = Number(counted) || 0;
  const liveVariance = current?.session ? countedNum - current.expectedCash : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Explanation */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Wallet className="h-6 w-6 text-brass-400" />
          Cash Drawer & Daily Balance (මුදල් ලාච්චුව සහ දවසේ ආදායම)
        </h1>
        <p className="text-xs text-paper-200 mt-1 max-w-2xl">
          උදෑසන ආරම්භක මුදල (Opening Float) ඇතුළත් කර ලාච්චුව ආරම්භ කරන්න. සවස shift අවසානයේ ලාච්චුවේ ඇති මුළු මුදල් ප්‍රමාණය ගණන් කර (Counted Cash) දවසේ ආදායම සමඟ balance කරන්න.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* When Drawer is OPEN: Show Full Day Income & Balancing Form */}
      {current?.session ? (
        <div className="space-y-6">
          {/* Day Income Overview */}
          {current.dayIncome && (
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    Today’s Shift Income (දවසේ උපයාගත් ආදායම)
                  </h2>
                  <p className="text-xs text-paper-200">
                    Opened at {new Date(current.session.openedAt).toLocaleTimeString("en-LK")} by {current.session.openedBy.name}
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Session
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                  <span className="text-[11px] text-paper-200 uppercase font-semibold">Total Sales</span>
                  <p className="text-lg font-black text-white mt-1">
                    {lkr(current.dayIncome.totalRevenue)}
                  </p>
                  <span className="text-[10px] text-paper-200/60">
                    {current.dayIncome.billCount} bills issued
                  </span>
                </div>

                <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                  <span className="text-[11px] text-paper-200 uppercase font-semibold">Cash Income</span>
                  <p className="text-lg font-black text-brass-400 mt-1">
                    {lkr(current.dayIncome.cashSales)}
                  </p>
                  <span className="text-[10px] text-paper-200/60">Cash in hand</span>
                </div>

                <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                  <span className="text-[11px] text-paper-200 uppercase font-semibold">Card Income</span>
                  <p className="text-lg font-black text-sky-400 mt-1">
                    {lkr(current.dayIncome.cardSales)}
                  </p>
                  <span className="text-[10px] text-paper-200/60">Bank transfers / POS</span>
                </div>

                <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                  <span className="text-[11px] text-paper-200 uppercase font-semibold">Credit Sales</span>
                  <p className="text-lg font-black text-amber-400 mt-1">
                    {lkr(current.dayIncome.creditSales)}
                  </p>
                  <span className="text-[10px] text-paper-200/60">Pay later</span>
                </div>
              </div>
            </div>
          )}

          {/* Reconcile & Close Shift Drawer Form */}
          <form
            onSubmit={closeDrawer}
            className="rounded-3xl border border-white/10 bg-ink-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Balance Cash Drawer & Close Shift (ලාච්චුව සමබර කර වසා තැබීම)
                </h3>
                <p className="text-xs text-paper-200">
                  සවස කවුන්ටරය අවසන් කරන විට මුදල් ලාච්චුවේ ඇති මුළු මුදල ගණන් කර ඇතුළත් කරන්න.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/5 bg-ink-950 p-4">
                <span className="text-xs text-paper-200">Opening Float (ආරම්භක මුදල)</span>
                <p className="text-base font-bold text-white mt-1">
                  {lkr(current.session.openingFloat)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-ink-950 p-4">
                <span className="text-xs text-paper-200">+ Day Cash Sales (එකතු වූ මුදල්)</span>
                <p className="text-base font-bold text-brass-400 mt-1">
                  +{lkr(current.cashSales || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-brass-400/30 bg-brass-500/10 p-4">
                <span className="text-xs font-semibold text-brass-400">
                  = Expected in Drawer (තිබිය යුතු මුදල)
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {lkr(current.expectedCash)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                  Counted Cash in Drawer (ලාච්චුවේ ගණන් කළ සැබෑ මුදල) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 23500"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-lg font-bold text-white font-mono placeholder:text-paper-200/30 focus:border-brass-400"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                  Shift Notes / සටහන් (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Day shift balanced by cashier"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-sm text-white placeholder:text-paper-200/30 focus:border-brass-400"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {counted !== "" && (
              <div
                className={`rounded-2xl border p-4 flex items-center justify-between ${
                  liveVariance === 0
                    ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                    : liveVariance > 0
                    ? "border-sky-500/40 bg-sky-950/20 text-sky-300"
                    : "border-amber-500/40 bg-amber-950/20 text-amber-300"
                }`}
              >
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider block">
                    Cash Variance (වෙනස):
                  </span>
                  <span className="text-lg font-black">
                    {liveVariance === 0
                      ? "Perfect Balance! (රු. 0.00)"
                      : liveVariance > 0
                      ? `Over by +${lkr(liveVariance)} (වැඩියෙන් ඇත)`
                      : `Short by ${lkr(liveVariance)} (අඩුවෙන් ඇත)`}
                  </span>
                </div>
                {liveVariance === 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 py-3.5 text-sm font-bold shadow-lg shadow-brass-500/20 transition disabled:opacity-50"
            >
              {busy ? "Reconciling…" : "Close & Balance Day Session (ලාච්චුව වසා දවස අවසන් කරන්න)"}
            </button>
          </form>
        </div>
      ) : (
        /* Form to OPEN new drawer session */
        <form
          onSubmit={openDrawer}
          className="rounded-3xl border border-white/10 bg-ink-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4 max-w-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brass-500/15 text-brass-400 border border-brass-400/20">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Start New Shift Drawer</h2>
              <p className="text-xs text-paper-200">
                Enter initial float amount to begin accepting billing
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
              Opening Float Amount (ආරම්භක මුදල - රු.)
            </label>
            <input
              type="number"
              min="0"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-base font-bold text-white font-mono focus:border-brass-400"
              value={floatAmt}
              onChange={(e) => setFloatAmt(e.target.value)}
            />
            <p className="text-[11px] text-paper-200/60 mt-1">
              උදෑසන කවුන්ටරය අරඹන විට ලාච්චුවේ තැන්පත් කරන මාරු කාසි/නෝට්ටු ප්‍රමාණය.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 py-3 text-sm font-bold shadow-lg shadow-brass-500/20 transition disabled:opacity-50"
          >
            {busy ? "Opening…" : "Open Cash Drawer (ලාච්චුව අරඹන්න)"}
          </button>
        </form>
      )}

      {/* Last Closed Drawer Result Banner */}
      {closed && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-300">
              Shift Drawer Closed Successfully (ලාච්චුව සාර්ථකව අවසන් කරන ලදී)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div>Expected: <strong className="text-white">{lkr(closed.expectedCash)}</strong></div>
            <div>Counted: <strong className="text-white">{lkr(closed.actualCash)}</strong></div>
            <div>
              Variance:{" "}
              <strong className={closed.variance === 0 ? "text-emerald-400" : "text-amber-400"}>
                {lkr(closed.variance)}
              </strong>
            </div>
            <div>Closed at: {new Date(closed.closedAt).toLocaleTimeString("en-LK")}</div>
          </div>
        </div>
      )}

      {/* History of Drawer Closings */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-brass-400" />
          Recent Shift Balancing History (පසුගිය දිනවල ලාච්චු වාර්තා)
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-paper-200/50 py-4">No closed drawer history recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="rounded-2xl border border-white/5 bg-ink-900/80 p-4 transition hover:border-white/15"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm text-white">
                      {new Date(h.closedAt).toLocaleDateString("en-LK")} ·{" "}
                      {new Date(h.closedAt).toLocaleTimeString("en-LK")}
                    </span>
                    <p className="text-xs text-paper-200 mt-0.5">
                      Opened by <strong>{h.openedBy.name}</strong> · Closed by{" "}
                      <strong>{h.closedBy?.name || "System"}</strong>
                      {h.notes ? ` · Note: "${h.notes}"` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-paper-200">
                      Expected: <strong>{lkr(h.expectedCash)}</strong>
                    </span>
                    <span className="text-paper-200">
                      Counted: <strong className="text-white">{lkr(h.actualCash)}</strong>
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        h.variance === 0
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {h.variance === 0 ? "Balanced" : `Var: ${lkr(h.variance)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
