"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";
import {
  Plus,
  Search,
  X,
  AlertTriangle,
  Package,
  Layers,
  Edit2,
  Tag,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

type Category = { id: string; name: string; kind: string };
type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  costPrice: number;
  sellPrice: number;
  trackStock: boolean;
  stockQty: number;
  lowStockThreshold: number;
  quickButton: boolean;
  active: boolean;
  lowStock: boolean;
};

const empty = {
  sku: "",
  barcode: "",
  name: "",
  categoryId: "",
  costPrice: 0,
  sellPrice: 0,
  trackStock: true,
  stockQty: 0,
  lowStockThreshold: 5,
  quickButton: false,
  active: true,
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, c] = await Promise.all([
      api<Product[]>(`/api/products?all=1${q ? `&q=${encodeURIComponent(q)}` : ""}`),
      api<Category[]>("/api/categories"),
    ]);
    setProducts(p);
    setCategories(c);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [q]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchesLowStock = !filterLowStockOnly || p.lowStock;
      return matchesCat && matchesLowStock;
    });
  }, [products, selectedCategory, filterLowStockOnly]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.lowStock).length,
    [products]
  );

  function openCreateModal() {
    setEditing(null);
    setForm({
      ...empty,
      categoryId: categories[0]?.id || "",
      sku: `SKU-${Date.now().toString().slice(-6)}`,
    });
    setModalError("");
    setIsModalOpen(true);
  }

  function openEditModal(p: Product) {
    setEditing(p.id);
    setForm({
      sku: p.sku,
      barcode: p.barcode || "",
      name: p.name,
      categoryId: p.categoryId,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      trackStock: p.trackStock,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      quickButton: p.quickButton,
      active: p.active,
    });
    setModalError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
    setModalError("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setModalError("");
    setSaving(true);
    const payload = {
      ...form,
      barcode: form.barcode.trim() || null,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      stockQty: Number(form.stockQty),
      lowStockThreshold: Number(form.lowStockThreshold),
    };

    try {
      if (editing) {
        await api(`/api/products/${editing}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      }
      closeModal();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  const profitPreview = Number(form.sellPrice) - Number(form.costPrice);
  const marginPreview =
    Number(form.sellPrice) > 0
      ? Math.round((profitPreview / Number(form.sellPrice)) * 100)
      : 0;

  return (
    <div className="space-y-5 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-brass-400" />
            Inventory & Services
          </h1>
          <p className="text-xs text-paper-200 mt-0.5">
            Total {products.length} items catalogued · {lowStockCount} low stock alerts
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-brass-500/20 transition active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New Item</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-paper-200/40 focus:border-brass-400 focus:ring-1 focus:ring-brass-400/30 transition"
            placeholder="Search items by name, SKU, or barcode…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-200/50" />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-200/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Categories Tab Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              selectedCategory === "ALL"
                ? "bg-brass-500 text-ink-950 font-bold shadow"
                : "border border-white/10 bg-ink-900/80 text-paper-200 hover:bg-ink-800 hover:text-white"
            }`}
          >
            All Items ({products.length})
          </button>

          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            const active = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
                  active
                    ? "bg-brass-500 text-ink-950 font-bold shadow"
                    : "border border-white/10 bg-ink-900/80 text-paper-200 hover:bg-ink-800 hover:text-white"
                }`}
              >
                <span>{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  active ? "bg-ink-950/20 text-ink-950" : "bg-white/10 text-paper-200"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {lowStockCount > 0 && (
            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ml-auto ${
                filterLowStockOnly
                  ? "bg-amber-500 text-ink-950 font-bold"
                  : "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock ({lowStockCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Product List Cards */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-paper-200/40 mb-3" />
            <p className="text-sm font-medium text-white">No products found</p>
            <p className="text-xs text-paper-200 mt-1">
              Try searching a different keyword or category, or add a new item.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-semibold text-white transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add New Item
            </button>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const catName = categoryMap.get(p.categoryId) || "Uncategorized";
            const profit = p.sellPrice - p.costPrice;
            const margin =
              p.sellPrice > 0 ? Math.round((profit / p.sellPrice) * 100) : 0;

            return (
              <div
                key={p.id}
                className={`group rounded-2xl border p-4 transition-all hover:border-brass-400/40 ${
                  p.lowStock
                    ? "border-amber-500/40 bg-amber-950/20"
                    : "border-white/10 bg-ink-900/80 hover:bg-ink-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-white">{p.name}</span>
                      <span className="rounded-md border border-white/10 bg-ink-950/60 px-2 py-0.5 text-[11px] font-medium text-brass-400">
                        {catName}
                      </span>
                      {p.quickButton && (
                        <span className="rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                          ⚡ POS Fast Button
                        </span>
                      )}
                      {!p.active && (
                        <span className="rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-medium text-red-300">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-paper-200/60 font-mono">
                      <span>SKU: {p.sku}</span>
                      {p.barcode && <span>Barcode: {p.barcode}</span>}
                    </div>

                    <div className="flex items-center gap-4 text-xs pt-0.5 flex-wrap">
                      <div>
                        <span className="text-paper-200">Sell: </span>
                        <span className="font-bold text-white text-sm">
                          {lkr(p.sellPrice)}
                        </span>
                      </div>
                      <div className="text-paper-200">
                        <span>Cost: </span>
                        <span>{lkr(p.costPrice)}</span>
                      </div>
                      <div className="text-emerald-400 font-medium">
                        <span>Profit: +{lkr(profit)} ({margin}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t border-white/5 sm:border-0 pt-2 sm:pt-0">
                    <div>
                      {p.trackStock ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            p.lowStock
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {p.lowStock ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          <span>Stock: {p.stockQty}</span>
                        </span>
                      ) : (
                        <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-paper-200">
                          Service Item
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => openEditModal(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-ink-800 hover:bg-ink-700 border border-white/10 px-3 py-1.5 text-xs font-medium text-paper-100 hover:text-white transition"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-brass-400" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* POPUP MODAL for Add / Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-ink-900 p-6 sm:p-7 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass-500/15 text-brass-400 border border-brass-400/20">
                  {editing ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editing ? "Edit Inventory Item" : "Add New Item"}
                  </h2>
                  <p className="text-xs text-paper-200">
                    {editing
                      ? "Update product or service details"
                      : "Create a new book, stationery or communication service"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-paper-200 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={save} className="mt-5 space-y-4">
              {modalError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  {modalError}
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                  Item Name *
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-sm text-white placeholder:text-paper-200/40 focus:border-brass-400 focus:ring-1 focus:ring-brass-400 transition"
                  placeholder="e.g. CR 80-page Single Ruled Book or Mobile Reload 100"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                    SKU Code *
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2 text-sm text-white font-mono focus:border-brass-400 transition"
                    placeholder="e.g. BK-001"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                    Barcode (Optional)
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2 text-sm text-white font-mono focus:border-brass-400 transition"
                    placeholder="Scan or type barcode"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-paper-200">
                  Category *
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-sm text-white focus:border-brass-400 transition"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.kind})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing (Cost & Sell) */}
              <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-paper-200">
                      Cost Price (Rs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white font-mono focus:border-brass-400 transition"
                      value={form.costPrice}
                      onChange={(e) =>
                        setForm({ ...form, costPrice: Number(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-paper-200">
                      Selling Price (Rs.) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm font-bold text-brass-400 font-mono focus:border-brass-400 transition"
                      value={form.sellPrice}
                      onChange={(e) =>
                        setForm({ ...form, sellPrice: Number(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-paper-200/80 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Profit: {profitPreview >= 0 ? `+${lkr(profitPreview)}` : lkr(profitPreview)}
                  </span>
                  <span>Margin: {marginPreview}%</span>
                </div>
              </div>

              {/* Stock Tracking */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-950/60 p-3.5">
                <label className="flex items-center gap-2.5 text-sm font-medium text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-brass-500"
                    checked={form.trackStock}
                    onChange={(e) =>
                      setForm({ ...form, trackStock: e.target.checked })
                    }
                  />
                  <span>Track Physical Stock Quantity</span>
                </label>

                {form.trackStock ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs text-paper-200">
                        Current Stock Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white font-mono focus:border-brass-400"
                        value={form.stockQty}
                        onChange={(e) =>
                          setForm({ ...form, stockQty: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-paper-200">
                        Low Stock Alert At
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white font-mono focus:border-brass-400"
                        value={form.lowStockThreshold}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            lowStockThreshold: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-paper-200/60">
                    Unlimited service or instant reloads (stock count not tracked).
                  </p>
                )}
              </div>

              {/* Checkbox Options */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-paper-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-brass-500"
                    checked={form.quickButton}
                    onChange={(e) =>
                      setForm({ ...form, quickButton: e.target.checked })
                    }
                  />
                  <span>Show as Quick Button on POS</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-paper-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-brass-500"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  <span>Active Item</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-semibold text-paper-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brass-500 hover:bg-brass-400 text-ink-950 px-5 py-2.5 text-xs font-bold shadow-lg shadow-brass-500/20 transition disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
