"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";
import {
  Calendar,
  TrendingUp,
  Receipt,
  DollarSign,
  CreditCard,
  Wallet,
  Users,
  Award,
  Clock,
  Printer,
  ChevronRight,
  Filter,
} from "lucide-react";

type ReportData = {
  day?: string;
  from: string;
  to: string;
  saleCount: number;
  revenue: number;
  cost: number;
  profit: number;
  payments: { cash: number; card: number; credit: number };
  topItems: { productId: string; name: string; qty: number; revenue: number }[];
};

type Sale = {
  id: string;
  invoiceNo: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
  createdAt: string;
  cashier?: { name: string };
  customer?: { name: string; phone: string } | null;
  items: { name: string; qty: number; lineTotal: number }[];
};

type Period = "today" | "week" | "month" | "year";

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [report, setReport] = useState<ReportData | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");

  // Calculate Date bounds for the selected period
  const dateBounds = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    if (period === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (period === "year") {
      start.setDate(now.getDate() - 365);
      start.setHours(0, 0, 0, 0);
    }

    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }, [period]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [r, s] = await Promise.all([
        period === "today"
          ? api<ReportData>("/api/reports/today")
          : api<ReportData>(
              `/api/reports/range?from=${encodeURIComponent(
                dateBounds.from
              )}&to=${encodeURIComponent(dateBounds.to)}`
            ),
        api<Sale[]>(
          `/api/sales?from=${encodeURIComponent(
            dateBounds.from
          )}&to=${encodeURIComponent(dateBounds.to)}`
        ),
      ]);
      setReport(r);
      setSales(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [period, dateBounds]);

  const filteredSales = useMemo(() => {
    if (!searchInvoice.trim()) return sales;
    const q = searchInvoice.toLowerCase();
    return sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.cashier?.name?.toLowerCase().includes(q) ||
        s.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [sales, searchInvoice]);

  const periodLabel = {
    today: "Today's Report (අද දවසේ වාර්තාව)",
    week: "This Week (පසුගිය දින 7 වාර්තාව)",
    month: "This Month (මාසික වාර්තාව)",
    year: "This Year (වාර්ෂික වාර්තාව)",
  }[period];

  const profitMargin =
    report && report.revenue > 0
      ? Math.round((report.profit / report.revenue) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-brass-400" />
            Financial & Sales Reports
          </h1>
          <p className="text-xs text-paper-200 mt-0.5">{periodLabel}</p>
        </div>

        {/* Period Selector Tabs */}
        <div className="inline-flex rounded-xl border border-white/10 bg-ink-900 p-1">
          <button
            onClick={() => setPeriod("today")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              period === "today"
                ? "bg-brass-500 text-ink-950 shadow"
                : "text-paper-200 hover:text-white"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod("week")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              period === "week"
                ? "bg-brass-500 text-ink-950 shadow"
                : "text-paper-200 hover:text-white"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              period === "month"
                ? "bg-brass-500 text-ink-950 shadow"
                : "text-paper-200 hover:text-white"
            }`}
          >
            1 Month
          </button>
          <button
            onClick={() => setPeriod("year")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              period === "year"
                ? "bg-brass-500 text-ink-950 shadow"
                : "text-paper-200 hover:text-white"
            }`}
          >
            1 Year
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Primary Summary Stats */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-12 text-center text-paper-200">
          Loading report data…
        </div>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-paper-200 uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brass-500/15 text-brass-400">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {lkr(report.revenue)}
              </p>
              <p className="mt-1 text-xs text-paper-200/60">
                Gross sales in selected period
              </p>
            </div>

            {/* Net Profit */}
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-paper-200 uppercase tracking-wider">
                  Net Profit
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-400">
                {lkr(report.profit)}
              </p>
              <p className="mt-1 text-xs text-emerald-400/80 font-medium">
                {profitMargin}% Profit Margin
              </p>
            </div>

            {/* Bills / Transactions */}
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-paper-200 uppercase tracking-wider">
                  Total Bills
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {report.saleCount}
              </p>
              <p className="mt-1 text-xs text-paper-200/60">
                Completed invoices issued
              </p>
            </div>

            {/* Cost of Goods */}
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-paper-200 uppercase tracking-wider">
                  Cost of Stock
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {lkr(report.cost)}
              </p>
              <p className="mt-1 text-xs text-paper-200/60">Total purchase expense</p>
            </div>
          </div>

          {/* Payment Method Breakdown Bar */}
          <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5">
            <h3 className="text-sm font-bold text-white mb-3">
              Payment Methods Collection (ගෙවීම් ක්‍රම අනුව ලැබීම්)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-paper-200">Cash (මුදල්)</span>
                  <span className="text-xs font-bold text-white">
                    {lkr(report.payments.cash)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-paper-200">Card (කාඩ්පත්)</span>
                  <span className="text-xs font-bold text-white">
                    {lkr(report.payments.card)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-ink-950 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-paper-200">Credit / ණය</span>
                  <span className="text-xs font-bold text-amber-300">
                    {lkr(report.payments.credit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Products / Services */}
          {report.topItems.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-brass-400" />
                <h3 className="text-sm font-bold text-white">
                  Top Selling Products & Services (වැඩිපුරම අලෙවි වූ ද්‍රව්‍ය)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {report.topItems.map((item, idx) => (
                  <div
                    key={item.productId}
                    className="rounded-xl border border-white/5 bg-ink-950 p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass-500/20 text-[10px] font-bold text-brass-400">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                          {item.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-paper-200 mt-1">
                        Qty Sold: <span className="font-bold text-white">{item.qty}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-brass-400">
                      {lkr(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Bills Ledger */}
          <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-brass-400" />
                <h3 className="text-sm font-bold text-white">
                  Invoices Ledger ({filteredSales.length} bills in this period)
                </h3>
              </div>
              <input
                type="text"
                className="w-full sm:w-64 rounded-xl border border-white/10 bg-ink-950 px-3 py-1.5 text-xs text-white placeholder:text-paper-200/40 focus:border-brass-400"
                placeholder="Search invoice or items…"
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
              />
            </div>

            {filteredSales.length === 0 ? (
              <p className="text-xs text-paper-200/50 py-6 text-center">
                No invoices recorded in this period.
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredSales.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/5 bg-ink-950 p-3.5 transition hover:border-white/15"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-white">
                          {s.invoiceNo}
                        </span>
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-paper-200">
                          {new Date(s.createdAt).toLocaleDateString("en-LK")} ·{" "}
                          {new Date(s.createdAt).toLocaleTimeString("en-LK")}
                        </span>
                        <span className="rounded-md border border-white/10 bg-ink-900 px-2 py-0.5 text-[10px] font-medium text-brass-400 uppercase">
                          {s.paymentMethod}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-white">
                          {lkr(s.total)}
                        </span>
                        {s.discount > 0 && (
                          <span className="block text-[10px] text-amber-300">
                            Discount: {lkr(s.discount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-paper-200/70 border-t border-white/5 pt-2">
                      <span className="truncate max-w-md">
                        {s.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                      </span>
                      <span>
                        Cashier: <strong className="text-paper-100">{s.cashier?.name}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
