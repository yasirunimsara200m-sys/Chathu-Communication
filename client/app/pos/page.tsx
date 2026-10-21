"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { Guard, TopBar } from "@/components/Guard";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";
import {
  Wallet,
  DollarSign,
  CreditCard,
  Receipt as ReceiptIcon,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Printer,
  Maximize2,
} from "lucide-react";

type Category = { id: string; name: string; kind: string };
type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  sellPrice: number;
  trackStock: boolean;
  stockQty: number;
  lowStock: boolean;
  quickButton: boolean;
  category?: Category;
};
type Customer = { id: string; name: string; phone: string; creditBalance: number };
type CartLine = {
  product: Product;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
};
type Sale = {
  id: string;
  invoiceNo: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
  cashTendered: number;
  changeGiven: number;
  items: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
  cashier?: { name: string };
  customer?: { name: string } | null;
};

export default function PosPage() {
  return (
    <Guard>
      <PosInner />
    </Guard>
  );
}

function PosInner() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [payMode, setPayMode] = useState<"CASH" | "CARD" | "CREDIT">("CASH");
  const [tendered, setTendered] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Cashier Drawer & Daily Balance modal state
  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);
  const [countedCash, setCountedCash] = useState("");
  const [openingFloatInput, setOpeningFloatInput] = useState("5000");
  const [drawerNotes, setDrawerNotes] = useState("");
  const [drawerModalError, setDrawerModalError] = useState("");
  const [drawerSuccessMsg, setDrawerSuccessMsg] = useState("");
  const [drawerBusy, setDrawerBusy] = useState(false);

  async function loadCatalog(q = query, categoryId = cat) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (categoryId) qs.set("categoryId", categoryId);
    const [p, c, cust] = await Promise.all([
      api<Product[]>(`/api/products?${qs.toString()}`),
      api<Category[]>("/api/categories"),
      api<Customer[]>("/api/customers"),
    ]);
    setProducts(p);
    setCategories(c);
    setCustomers(cust);
  }

  useEffect(() => {
    loadCatalog().catch((e) => setError(e.message));
    barcodeRef.current?.focus();
  }, []);

  async function openDailyBalanceModal() {
    setIsDrawerModalOpen(true);
    setDrawerModalError("");
    setDrawerSuccessMsg("");
    setDrawerBusy(true);
    try {
      const data = await api<any>("/api/drawer/current");
      setDrawerData(data);
    } catch (e) {
      setDrawerModalError(e instanceof Error ? e.message : "Failed to load drawer data");
    } finally {
      setDrawerBusy(false);
    }
  }

  async function handleStartShiftDrawer(e: FormEvent) {
    e.preventDefault();
    setDrawerBusy(true);
    setDrawerModalError("");
    try {
      await api("/api/drawer/open", {
        method: "POST",
        body: JSON.stringify({ openingFloat: Number(openingFloatInput) }),
      });
      const data = await api<any>("/api/drawer/current");
      setDrawerData(data);
      setDrawerSuccessMsg("Cash drawer opened successfully!");
    } catch (err) {
      setDrawerModalError(err instanceof Error ? err.message : "Failed to open drawer");
    } finally {
      setDrawerBusy(false);
    }
  }

  async function handleBalanceAndCloseDrawer(e: FormEvent) {
    e.preventDefault();
    setDrawerBusy(true);
    setDrawerModalError("");
    try {
      const res = await api<any>("/api/drawer/close", {
        method: "POST",
        body: JSON.stringify({ actualCash: Number(countedCash), notes: drawerNotes }),
      });
      setDrawerSuccessMsg("Day's Shift Balanced & Closed Successfully!");
      setCountedCash("");
      setDrawerNotes("");
      const data = await api<any>("/api/drawer/current");
      setDrawerData(data);
    } catch (err) {
      setDrawerModalError(err instanceof Error ? err.message : "Failed to balance drawer");
    } finally {
      setDrawerBusy(false);
    }
  }

  const quick = products.filter((p) => p.quickButton);
  const grid = products.filter((p) => (cat ? true : !p.quickButton) || cat);

  const subtotal = cart.reduce(
    (s, l) => s + l.unitPrice * l.qty - l.lineDiscount,
    0
  );
  const total = Math.max(0, round(subtotal - billDiscount));
  const tenderNum = Number(tendered || 0);
  const change =
    payMode === "CASH" ? Math.max(0, round(tenderNum - total)) : 0;

  function addToCart(p: Product, qty = 1) {
    setCart((curr) => {
      const idx = curr.findIndex((l) => l.product.id === p.id);
      if (idx >= 0) {
        const next = [...curr];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [
        ...curr,
        { product: p, qty, unitPrice: p.sellPrice, lineDiscount: 0 },
      ];
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) {
      setCart((c) => c.filter((l) => l.product.id !== id));
      return;
    }
    setCart((c) =>
      c.map((l) => (l.product.id === id ? { ...l, qty } : l))
    );
  }

  function updatePrice(id: string, unitPrice: number) {
    setCart((c) =>
      c.map((l) => (l.product.id === id ? { ...l, unitPrice } : l))
    );
  }

  function updateDiscount(id: string, lineDiscount: number) {
    setCart((c) =>
      c.map((l) => (l.product.id === id ? { ...l, lineDiscount } : l))
    );
  }

  async function onBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
        p.sku.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      addToCart(match, 1);
      return;
    }
    try {
      const found = await api<Product[]>(
        `/api/products?q=${encodeURIComponent(trimmed)}`
      );
      if (found[0]) addToCart(found[0], 1);
      else setError(`Item not found for "${trimmed}"`);
    } catch {
      setError(`Search failed for "${trimmed}"`);
    }
  }

  async function checkout() {
    setError("");
    if (!cart.length) return;
    setBusy(true);

    const body: Record<string, unknown> = {
      items: cart.map((l) => ({
        productId: l.product.id,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineDiscount: l.lineDiscount,
      })),
      discount: billDiscount,
      customerId: customerId || null,
      cashAmount: payMode === "CASH" ? total : 0,
      cardAmount: payMode === "CARD" ? total : 0,
      creditAmount: payMode === "CREDIT" ? total : 0,
      cashTendered: payMode === "CASH" ? tenderNum || total : 0,
    };

    try {
      const sale = await api<Sale>("/api/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setLastSale(sale);
      setCart([]);
      setBillDiscount(0);
      setTendered("");
      await loadCatalog();
      setTimeout(() => window.print(), 250);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sale failed");
    } finally {
      setBusy(false);
      barcodeRef.current?.focus();
    }
  }

  const cashierLiveVariance =
    drawerData?.session && countedCash !== ""
      ? Number(countedCash) - drawerData.expectedCash
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-paper-50">
      <TopBar
        title="Counter billing"
        right={
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition flex items-center gap-1.5"
              onClick={openDailyBalanceModal}
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Daily Balance & Drawer (දවසේ ආදායම)</span>
            </button>
            <button
              className="rounded-lg bg-brass-500 hover:bg-brass-400 px-3 py-1.5 text-xs font-bold text-ink-950 transition"
              onClick={() => barcodeRef.current?.focus()}
            >
              Focus Scanner
            </button>
          </div>
        }
      />

      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[1.2fr_0.9fr_0.85fr]">
        {/* Left Column: Barcode, Quick buttons & Catalog */}
        <section className="flex flex-col rounded-xl border border-white/10 bg-ink-900 p-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onBarcode(query);
              setQuery("");
            }}
          >
            <input
              ref={barcodeRef}
              className="flex-1 rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-paper-200/40 focus:border-brass-400"
              placeholder="Scan barcode or type SKU / item name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-lg bg-brass-500 hover:bg-brass-400 px-4 py-2 text-xs font-bold text-ink-950"
            >
              Add
            </button>
          </form>

          {/* Quick Buttons */}
          {quick.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wider text-paper-200/70">
                Quick Service Buttons
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quick.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p, 1)}
                    className="rounded-lg border border-white/10 bg-ink-800 p-2 text-left hover:border-brass-400/60 transition active:scale-95"
                  >
                    <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                    <p className="text-xs font-bold text-brass-400">{lkr(p.sellPrice)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter Chips */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={cat === ""} onClick={() => { setCat(""); loadCatalog(query, ""); }}>
              All items
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={cat === c.id}
                onClick={() => { setCat(c.id); loadCatalog(query, c.id); }}
              >
                {c.name}
              </Chip>
            ))}
          </div>

          {/* Items Grid */}
          <div className="mt-3 grid flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 max-h-[460px]">
            {grid.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p, 1)}
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-ink-800 p-2.5 text-left hover:border-brass-400/60 transition active:scale-95"
              >
                <div>
                  <p className="line-clamp-2 text-xs font-medium text-white">{p.name}</p>
                  <p className="mt-0.5 text-[10px] text-paper-200/50">{p.sku}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-brass-400">{lkr(p.sellPrice)}</p>
                  {p.trackStock && (
                    <span
                      className={`text-[10px] ${
                        p.stockQty <= 0
                          ? "text-red-400 font-bold"
                          : p.lowStock
                          ? "text-amber-400 font-bold"
                          : "text-paper-200/60"
                      }`}
                    >
                      {p.stockQty} in stock
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Center Column: Current Cart */}
        <section className="flex flex-col rounded-xl border border-white/10 bg-ink-900 p-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-sm font-bold text-white">
              Billing Cart ({cart.reduce((n, l) => n + l.qty, 0)} items)
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Clear Cart
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto py-2 max-h-[500px]">
            {cart.length === 0 && (
              <div className="py-16 text-center text-xs text-paper-200/40">
                Cart is empty. Scan an item or select from catalog.
              </div>
            )}
            {cart.map((l) => (
              <div key={l.product.id} className="rounded-lg bg-ink-800 p-2.5 space-y-1.5 border border-white/5">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-semibold text-xs text-white">{l.product.name}</span>
                    <span className="block text-[10px] text-paper-200/50">{l.product.sku}</span>
                  </div>
                  <span className="font-bold text-xs text-brass-400">
                    {lkr(l.unitPrice * l.qty - l.lineDiscount)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      className="h-6 w-6 rounded bg-ink-950 font-bold hover:bg-ink-700"
                      onClick={() => updateQty(l.product.id, l.qty - 1)}
                    >
                      -
                    </button>
                    <input
                      className="w-10 rounded bg-ink-950 py-0.5 text-center text-xs text-white"
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => updateQty(l.product.id, Number(e.target.value))}
                    />
                    <button
                      className="h-6 w-6 rounded bg-ink-950 font-bold hover:bg-ink-700"
                      onClick={() => updateQty(l.product.id, l.qty + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-paper-200">Price:</span>
                    <input
                      className="w-16 rounded bg-ink-950 px-1 py-0.5 text-right text-xs text-white"
                      type="number"
                      step="any"
                      value={l.unitPrice}
                      onChange={(e) => updatePrice(l.product.id, Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
            <Row label="Subtotal" value={lkr(subtotal)} />
            <div className="flex items-center justify-between">
              <span>Bill Discount (Rs.)</span>
              <input
                className="w-24 rounded bg-ink-950 px-2 py-1 text-right text-xs text-white"
                type="number"
                min="0"
                value={billDiscount}
                onChange={(e) => setBillDiscount(Number(e.target.value))}
              />
            </div>
            <Row label="Net Total" value={lkr(total)} strong />
          </div>
        </section>

        {/* Right Column: Checkout & Payment Mode */}
        <section className="flex flex-col gap-3">
          {/* Customer select */}
          <div className="rounded-xl border border-white/10 bg-ink-900 p-3">
            <label className="text-xs font-semibold text-paper-200 block mb-1">
              Customer / Phone (Optional)
            </label>
            <select
              className="w-full rounded-lg bg-ink-950 px-2.5 py-2 text-xs text-white"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone} {c.creditBalance > 0 ? `(Debt ${lkr(c.creditBalance)})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border border-white/10 bg-ink-900 p-3 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-paper-200 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["CASH", "CARD", "CREDIT"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMode(m)}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      payMode === m ? "bg-brass-500 text-ink-950 shadow" : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {payMode === "CASH" && (
                <div className="mt-3">
                  <label className="text-xs text-paper-200 block">Cash Tendered (දුන් මුදල)</label>
                  <input
                    type="number"
                    step="any"
                    className="mt-1 w-full rounded-lg bg-ink-950 px-3 py-2 text-sm font-bold text-white font-mono"
                    placeholder={`e.g. ${total}`}
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                  />
                  <div className="mt-2 flex justify-between rounded-lg bg-ink-950/80 p-2 text-xs">
                    <span>Change Due (ඉතිරි මුදල):</span>
                    <span className="font-bold text-emerald-400 text-sm">{lkr(change)}</span>
                  </div>
                </div>
              )}

              {payMode === "CREDIT" && (
                <p className="mt-3 text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  ⚠️ Credit requires customer selection. Bill amount will be added to customer ledger.
                </p>
              )}

              {error && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>

            <button
              disabled={busy || !cart.length || (payMode === "CREDIT" && !customerId)}
              onClick={checkout}
              className="mt-4 w-full rounded-xl bg-brass-500 hover:bg-brass-400 py-3.5 text-sm font-bold text-ink-950 shadow-lg shadow-brass-500/20 transition disabled:opacity-40"
            >
              {busy ? "Processing…" : `Charge & Print ${lkr(total)}`}
            </button>
          </div>
        </section>
      </div>

      {/* POS Thermal Receipt (80mm Continuous) */}
      <Receipt sale={lastSale} />

      {/* CASHIER DAILY BALANCE & CASH DRAWER MODAL */}
      {isDrawerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div
            className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-ink-900 p-6 sm:p-7 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Daily Balance & Drawer (දවසේ ආදායම හා ලාච්චුව)
                  </h2>
                  <p className="text-xs text-paper-200">
                    Cashier Shift Income Summary & Cash Reconciliation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerModalOpen(false)}
                className="rounded-lg p-1.5 text-paper-200 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {drawerSuccessMsg && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{drawerSuccessMsg}</span>
              </div>
            )}

            {drawerModalError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {drawerModalError}
              </div>
            )}

            {drawerData?.session ? (
              <div className="mt-5 space-y-5">
                {/* Day Income Cards for Cashier */}
                <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-brass-400" />
                      Today’s Shift Income (දවසේ ආදායම)
                    </span>
                    <span className="text-[11px] text-paper-200">
                      Started: {new Date(drawerData.session.openedAt).toLocaleTimeString("en-LK")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl bg-ink-900 p-2.5 border border-white/5">
                      <span className="text-[10px] text-paper-200 uppercase font-semibold">Total Revenue</span>
                      <p className="text-base font-bold text-white mt-0.5">
                        {lkr(drawerData.dayIncome?.totalRevenue || 0)}
                      </p>
                      <span className="text-[10px] text-paper-200/50">
                        {drawerData.dayIncome?.billCount || 0} bills
                      </span>
                    </div>

                    <div className="rounded-xl bg-ink-900 p-2.5 border border-white/5">
                      <span className="text-[10px] text-paper-200 uppercase font-semibold">Cash (මුදල්)</span>
                      <p className="text-base font-bold text-brass-400 mt-0.5">
                        {lkr(drawerData.dayIncome?.cashSales || 0)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-ink-900 p-2.5 border border-white/5">
                      <span className="text-[10px] text-paper-200 uppercase font-semibold">Card (කාඩ්පත්)</span>
                      <p className="text-base font-bold text-sky-400 mt-0.5">
                        {lkr(drawerData.dayIncome?.cardSales || 0)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-ink-900 p-2.5 border border-white/5">
                      <span className="text-[10px] text-paper-200 uppercase font-semibold">Credit (ණය)</span>
                      <p className="text-base font-bold text-amber-400 mt-0.5">
                        {lkr(drawerData.dayIncome?.creditSales || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cash Drawer Reconciliation */}
                <form onSubmit={handleBalanceAndCloseDrawer} className="space-y-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl bg-ink-950 p-3 border border-white/5 text-center">
                      <span className="text-[11px] text-paper-200 block">Opening Float</span>
                      <strong className="text-sm text-white">
                        {lkr(drawerData.session.openingFloat)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-ink-950 p-3 border border-white/5 text-center">
                      <span className="text-[11px] text-paper-200 block">+ Day Cash Sales</span>
                      <strong className="text-sm text-brass-400">
                        +{lkr(drawerData.cashSales || 0)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-brass-500/10 p-3 border border-brass-400/30 text-center">
                      <span className="text-[11px] font-semibold text-brass-400 block">
                        = Expected in Cash
                      </span>
                      <strong className="text-base text-white">
                        {lkr(drawerData.expectedCash)}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                      Counted Cash in Drawer (සවස ලාච්චුවේ ගණන් කළ මුදල - රු.) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="e.g. 23500"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-base font-bold text-white font-mono focus:border-brass-400"
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                    />
                  </div>

                  {countedCash !== "" && (
                    <div
                      className={`rounded-xl border p-3 flex items-center justify-between text-xs ${
                        cashierLiveVariance === 0
                          ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                          : cashierLiveVariance > 0
                          ? "border-sky-500/40 bg-sky-950/20 text-sky-300"
                          : "border-amber-500/40 bg-amber-950/20 text-amber-300"
                      }`}
                    >
                      <span className="font-semibold">
                        {cashierLiveVariance === 0
                          ? "✓ Perfect Match (සමබරයි - වෙනසක් නැත)"
                          : cashierLiveVariance > 0
                          ? `Over by +${lkr(cashierLiveVariance)} (වැඩියෙන් ඇත)`
                          : `Short by ${lkr(cashierLiveVariance)} (අඩුවෙන් ඇත)`}
                      </span>
                      <span className="font-mono font-bold">
                        {lkr(Math.abs(cashierLiveVariance))}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                      Shift Notes (සටහන් - Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Evening shift balanced by cashier"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2 text-xs text-white"
                      value={drawerNotes}
                      onChange={(e) => setDrawerNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDrawerModalOpen(false)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-paper-200 hover:text-white"
                    >
                      Keep Open & Continue Billing
                    </button>
                    <button
                      type="submit"
                      disabled={drawerBusy || !countedCash}
                      className="flex-1 rounded-xl bg-brass-500 hover:bg-brass-400 py-2.5 text-xs font-bold text-ink-950 shadow disabled:opacity-40"
                    >
                      {drawerBusy ? "Closing…" : "Balance & Close Day Shift"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* If no drawer session is currently open */
              <form onSubmit={handleStartShiftDrawer} className="mt-5 space-y-4">
                <p className="text-xs text-paper-200">
                  There is currently no active drawer session. Enter your starting cash float to open the shift.
                </p>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                    Opening Cash Float (ආරම්භක මුදල - රු.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-base font-bold text-white font-mono"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={drawerBusy}
                  className="w-full rounded-xl bg-brass-500 hover:bg-brass-400 py-3 text-xs font-bold text-ink-950"
                >
                  {drawerBusy ? "Starting…" : "Start Cash Drawer Shift"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs whitespace-nowrap transition ${
        active
          ? "bg-brass-500 font-bold text-ink-950 shadow"
          : "bg-white/10 text-paper-200 hover:bg-white/15 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-bold text-white pt-1" : "text-paper-200"}`}>
      <span>{label}</span>
      <span className={strong ? "text-brass-400" : ""}>{value}</span>
    </div>
  );
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function Receipt({ sale }: { sale: Sale | null }) {
  const shop = useMemo(
    () => ({
      name: "Chathu Communication",
      line: "Communication · Stationery · Books · Reloads",
      addr: "Sri Lanka",
      tel: "Tel: 077 123 4567",
    }),
    []
  );

  if (!sale) return <div id="receipt" className="hidden" />;

  return (
    <div id="receipt" className="hidden print:block">
      <div className="text-center pb-2">
        <h1 className="text-base font-black tracking-tight">{shop.name}</h1>
        <p className="text-[10px]">{shop.line}</p>
        <p className="text-[10px]">{shop.addr} · {shop.tel}</p>
        <div className="my-1.5 border-t border-dashed border-black" />
        <p className="text-[11px] font-bold">INVOICE: {sale.invoiceNo}</p>
        <p className="text-[10px]">
          {new Date(sale.createdAt).toLocaleDateString("en-LK")} ·{" "}
          {new Date(sale.createdAt).toLocaleTimeString("en-LK")}
        </p>
        <p className="text-[10px]">Cashier: {sale.cashier?.name || "Counter"}</p>
        {sale.customer && <p className="text-[10px]">Customer: {sale.customer.name}</p>}
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* Items table */}
      <table className="w-full text-[10px] my-1">
        <thead>
          <tr className="border-b border-dashed border-black text-left">
            <th className="pb-1">Item</th>
            <th className="pb-1 text-center">Qty</th>
            <th className="pb-1 text-right">Price</th>
            <th className="pb-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((i, idx) => (
            <tr key={idx} className="border-b border-dotted border-gray-400">
              <td className="py-1 pr-1 max-w-[120px] truncate">{i.name}</td>
              <td className="py-1 text-center">{i.qty}</td>
              <td className="py-1 text-right">{lkr(i.unitPrice)}</td>
              <td className="py-1 text-right font-semibold">{lkr(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black my-1" />

      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{lkr(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between font-medium">
            <span>Discount:</span>
            <span>-{lkr(sale.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black border-t border-b border-black py-0.5 my-1">
          <span>NET TOTAL:</span>
          <span>{lkr(sale.total)}</span>
        </div>

        {sale.cashAmount > 0 && (
          <>
            <div className="flex justify-between">
              <span>Cash Tendered:</span>
              <span>{lkr(sale.cashTendered || sale.cashAmount)}</span>
            </div>
            {sale.changeGiven > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change Due:</span>
                <span>{lkr(sale.changeGiven)}</span>
              </div>
            )}
          </>
        )}

        {sale.cardAmount > 0 && (
          <div className="flex justify-between">
            <span>Card Paid:</span>
            <span>{lkr(sale.cardAmount)}</span>
          </div>
        )}

        {sale.creditAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Credit Due:</span>
            <span>{lkr(sale.creditAmount)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2" />

      <div className="text-center text-[10px] space-y-0.5 pt-1">
        <p className="font-bold">ස්තුතියි! නැවත පැමිණෙන්න.</p>
        <p>Thank you for shopping with Chathu Communication!</p>
        <p className="text-[9px] text-gray-600">Software by Chathu POS</p>
      </div>
    </div>
  );
}
