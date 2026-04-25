"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Category {
  id: number;
  name: string;
  sort_order: number;
}

interface Product {
  id: number;
  category_id: number | null;
  category_name: string | null;
  name: string;
  description: string | null;
  thickness: string | null;
  unit: string;
  sell_price: number;
  cost_price: number;
  min_width_mm: number | null;
  max_width_mm: number | null;
  min_height_mm: number | null;
  max_height_mm: number | null;
  min_m2: number | null;
  pattern_name: string | null;
  active: boolean;
  sort_order: number;
}

interface Operation {
  id: number;
  category_id: number | null;
  category_name: string | null;
  name: string;
  description: string | null;
  unit: string;
  sell_price: number;
  cost_price: number;
  active: boolean;
  sort_order: number;
}

type Tab = "products" | "operations" | "categories" | "settings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return Number(n).toFixed(2);
}

function unitLabel(unit: string) {
  const map: Record<string, string> = {
    m2: "per m²",
    linear_m: "per lin. m",
    item: "per item",
  };
  return map[unit] ?? unit;
}

function groupBy<T extends { category_name: string | null; category_id: number | null }>(
  items: T[]
): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category_name ?? "Uncategorised";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ---------------------------------------------------------------------------
// Product form modal
// ---------------------------------------------------------------------------
const BLANK_PRODUCT = {
  categoryId: "" as string | number,
  name: "",
  description: "",
  thickness: "",
  unit: "m2",
  sellPrice: "",
  costPrice: "",
  minWidthMm: "",
  maxWidthMm: "",
  minHeightMm: "",
  maxHeightMm: "",
  minM2: "",
  patternName: "",
  active: true,
  sortOrder: "0",
};

function ProductModal({
  product,
  categories,
  onSave,
  onClose,
}: {
  product: Product | null;
  categories: Category[];
  onSave: (data: typeof BLANK_PRODUCT) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(
    product
      ? {
          categoryId: product.category_id ?? "",
          name: product.name,
          description: product.description ?? "",
          thickness: product.thickness ?? "",
          unit: product.unit,
          sellPrice: fmt(product.sell_price),
          costPrice: fmt(product.cost_price),
          minWidthMm: product.min_width_mm?.toString() ?? "",
          maxWidthMm: product.max_width_mm?.toString() ?? "",
          minHeightMm: product.min_height_mm?.toString() ?? "",
          maxHeightMm: product.max_height_mm?.toString() ?? "",
          minM2: product.min_m2?.toString() ?? "",
          patternName: product.pattern_name ?? "",
          active: product.active,
          sortOrder: product.sort_order.toString(),
        }
      : { ...BLANK_PRODUCT }
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 4-12-4 DGU Standard"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description for the job line item"
            />
          </div>

          {/* Thickness + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Thickness</label>
              <input
                value={form.thickness}
                onChange={(e) => set("thickness", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 20mm unit"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="m2">m² (area)</option>
                <option value="linear_m">Linear metre</option>
                <option value="item">Item / fixed</option>
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sell price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.sellPrice}
                onChange={(e) => set("sellPrice", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Size limits */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Size limits (mm) — optional</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={form.minWidthMm}
                onChange={(e) => set("minWidthMm", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min width"
              />
              <input
                type="number"
                value={form.maxWidthMm}
                onChange={(e) => set("maxWidthMm", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max width"
              />
              <input
                type="number"
                value={form.minHeightMm}
                onChange={(e) => set("minHeightMm", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min height"
              />
              <input
                type="number"
                value={form.maxHeightMm}
                onChange={(e) => set("maxHeightMm", e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max height"
              />
            </div>
          </div>

          {/* Min m² + Pattern */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min m² charge</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.minM2}
                onChange={(e) => set("minM2", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 0.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pattern name</label>
              <input
                value={form.patternName}
                onChange={(e) => set("patternName", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Obscure No.4"
              />
            </div>
          </div>

          {/* Sort + Active */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Operation form modal
// ---------------------------------------------------------------------------
const BLANK_OP = {
  categoryId: "" as string | number,
  name: "",
  description: "",
  unit: "item",
  sellPrice: "",
  costPrice: "",
  active: true,
  sortOrder: "0",
};

function OperationModal({
  operation,
  categories,
  onSave,
  onClose,
}: {
  operation: Operation | null;
  categories: Category[];
  onSave: (data: typeof BLANK_OP) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(
    operation
      ? {
          categoryId: operation.category_id ?? "",
          name: operation.name,
          description: operation.description ?? "",
          unit: operation.unit,
          sellPrice: fmt(operation.sell_price),
          costPrice: fmt(operation.cost_price),
          active: operation.active,
          sortOrder: operation.sort_order.toString(),
        }
      : { ...BLANK_OP }
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {operation ? "Edit Operation" : "Add Operation"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Polished edge"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Short description"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="item">Item / fixed</option>
              <option value="linear_m">Linear metre</option>
              <option value="m2">m² (area)</option>
            </select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sell price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.sellPrice}
                onChange={(e) => set("sellPrice", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sort + Active */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category form modal
// ---------------------------------------------------------------------------
function CategoryModal({
  category,
  onSave,
  onClose,
}: {
  category: Category | null;
  onSave: (name: string, sortOrder: number) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(name, Number(sortOrder));
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {category ? "Edit Category" : "Add Category"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Sealed Units"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm modal
// ---------------------------------------------------------------------------
function DeleteModal({
  label,
  onConfirm,
  onClose,
}: {
  label: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
        <p className="text-gray-800 font-medium mb-1">Delete &quot;{label}&quot;?</p>
        <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={deleting}
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main setup page
// ---------------------------------------------------------------------------
export default function SetupPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Account / supplier settings
  const [accountForm, setAccountForm] = useState({
    supplierName: "",
    supplierEmail: "",
    supplierPhone: "",
    vatRate: "0.20",
  });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);

  // Modals
  const [productModal, setProductModal] = useState<{ open: boolean; item: Product | null }>({ open: false, item: null });
  const [opModal, setOpModal] = useState<{ open: boolean; item: Operation | null }>({ open: false, item: null });
  const [catModal, setCatModal] = useState<{ open: boolean; item: Category | null }>({ open: false, item: null });
  const [deleteModal, setDeleteModal] = useState<{ label: string; onConfirm: () => Promise<void> } | null>(null);

  // Session token — comes from URL ?session=... or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sess = params.get("session") ?? localStorage.getItem("sm_session");
    if (sess) {
      localStorage.setItem("sm_session", sess);
      setToken(sess);
    }
  }, []);

  const apiFetch = useCallback(
    (url: string, opts?: RequestInit) =>
      fetch(url, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers ?? {}) },
      }),
    [token]
  );

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, o, c, acc] = await Promise.all([
        apiFetch("/api/sm/products").then((r) => r.json()),
        apiFetch("/api/sm/operations").then((r) => r.json()),
        apiFetch("/api/sm/categories").then((r) => r.json()),
        apiFetch("/api/sm/account").then((r) => r.json()),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setOperations(Array.isArray(o) ? o : []);
      setCategories(Array.isArray(c) ? c : []);
      if (acc && !acc.error) {
        setAccountForm({
          supplierName: acc.supplier_name ?? "",
          supplierEmail: acc.supplier_email ?? "",
          supplierPhone: acc.supplier_phone ?? "",
          vatRate: acc.vat_rate != null ? String(acc.vat_rate) : "0.20",
        });
      }
      setError(null);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token, apiFetch]);

  async function saveAccount() {
    setAccountLoading(true);
    setAccountSaved(false);
    await apiFetch("/api/sm/account", {
      method: "PUT",
      body: JSON.stringify({
        supplierName: accountForm.supplierName || null,
        supplierEmail: accountForm.supplierEmail || null,
        supplierPhone: accountForm.supplierPhone || null,
        vatRate: Number(accountForm.vatRate),
      }),
    });
    setAccountLoading(false);
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 2000);
  }

  useEffect(() => { loadAll(); }, [loadAll]);

  // ----- Products -----
  async function saveProduct(form: typeof BLANK_PRODUCT, id?: number) {
    const body = JSON.stringify({
      categoryId: form.categoryId || null,
      name: form.name,
      description: form.description || null,
      thickness: form.thickness || null,
      unit: form.unit,
      sellPrice: Number(form.sellPrice),
      costPrice: Number(form.costPrice),
      minWidthMm: form.minWidthMm ? Number(form.minWidthMm) : null,
      maxWidthMm: form.maxWidthMm ? Number(form.maxWidthMm) : null,
      minHeightMm: form.minHeightMm ? Number(form.minHeightMm) : null,
      maxHeightMm: form.maxHeightMm ? Number(form.maxHeightMm) : null,
      minM2: form.minM2 ? Number(form.minM2) : null,
      patternName: form.patternName || null,
      active: form.active,
      sortOrder: Number(form.sortOrder),
    });
    await apiFetch(id ? `/api/sm/products/${id}` : "/api/sm/products", {
      method: id ? "PUT" : "POST",
      body,
    });
    setProductModal({ open: false, item: null });
    await loadAll();
  }

  async function deleteProduct(id: number) {
    await apiFetch(`/api/sm/products/${id}`, { method: "DELETE" });
    setDeleteModal(null);
    await loadAll();
  }

  // ----- Operations -----
  async function saveOperation(form: typeof BLANK_OP, id?: number) {
    const body = JSON.stringify({
      categoryId: form.categoryId || null,
      name: form.name,
      description: form.description || null,
      unit: form.unit,
      sellPrice: Number(form.sellPrice),
      costPrice: Number(form.costPrice),
      active: form.active,
      sortOrder: Number(form.sortOrder),
    });
    await apiFetch(id ? `/api/sm/operations/${id}` : "/api/sm/operations", {
      method: id ? "PUT" : "POST",
      body,
    });
    setOpModal({ open: false, item: null });
    await loadAll();
  }

  async function deleteOperation(id: number) {
    await apiFetch(`/api/sm/operations/${id}`, { method: "DELETE" });
    setDeleteModal(null);
    await loadAll();
  }

  // ----- Categories -----
  async function saveCategory(name: string, sortOrder: number, id?: number) {
    await apiFetch(id ? `/api/sm/categories/${id}` : "/api/sm/categories", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ name, sortOrder }),
    });
    setCatModal({ open: false, item: null });
    await loadAll();
  }

  async function deleteCategory(id: number) {
    await apiFetch(`/api/sm/categories/${id}`, { method: "DELETE" });
    setDeleteModal(null);
    await loadAll();
  }

  // ----- Filter -----
  const q = search.toLowerCase();
  const filteredProducts = products.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.category_name ?? "").toLowerCase().includes(q)
  );
  const filteredOps = operations.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || (o.category_name ?? "").toLowerCase().includes(q)
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { window.location.href = "/addon"; }}
          className="text-gray-400 hover:text-gray-600 p-1 -ml-1 rounded-lg hover:bg-gray-50 transition-colors"
          title="Back to Workbench"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.9" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900">Coglass Setup</h1>
          <p className="text-xs text-gray-400">Manage your glass price book</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {(["products", "operations", "categories", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
            className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search + Add — hidden on settings tab */}
      {tab !== "settings" && (
        <div className="px-4 py-3 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              if (tab === "products") setProductModal({ open: true, item: null });
              else if (tab === "operations") setOpModal({ open: true, item: null });
              else setCatModal({ open: true, item: null });
            }}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span>
            <span>Add</span>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={loadAll} className="mt-3 text-blue-600 text-sm underline">Retry</button>
          </div>
        ) : tab === "products" ? (
          <ProductList
            groups={groupBy(filteredProducts)}
            onEdit={(p) => setProductModal({ open: true, item: p })}
            onDelete={(p) =>
              setDeleteModal({ label: p.name, onConfirm: () => deleteProduct(p.id) })
            }
          />
        ) : tab === "operations" ? (
          <OperationList
            groups={groupBy(filteredOps)}
            onEdit={(o) => setOpModal({ open: true, item: o })}
            onDelete={(o) =>
              setDeleteModal({ label: o.name, onConfirm: () => deleteOperation(o.id) })
            }
          />
        ) : tab === "categories" ? (
          <CategoryList
            categories={categories}
            onEdit={(c) => setCatModal({ open: true, item: c })}
            onDelete={(c) =>
              setDeleteModal({ label: c.name, onConfirm: () => deleteCategory(c.id) })
            }
          />
        ) : (
          /* Settings tab */
          <div className="max-w-lg space-y-5 pt-2">
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">Supplier Details</h2>
              <p className="text-xs text-gray-400 -mt-2">Used on Cut Sheets and emailed to suppliers.</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier name</label>
                <input
                  value={accountForm.supplierName}
                  onChange={(e) => setAccountForm((f) => ({ ...f, supplierName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Coglass Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier email</label>
                <input
                  type="email"
                  value={accountForm.supplierEmail}
                  onChange={(e) => setAccountForm((f) => ({ ...f, supplierEmail: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="orders@yoursupplier.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier phone</label>
                <input
                  type="tel"
                  value={accountForm.supplierPhone}
                  onChange={(e) => setAccountForm((f) => ({ ...f, supplierPhone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 01234 567890"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">Pricing</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">VAT rate</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={accountForm.vatRate}
                    onChange={(e) => setAccountForm((f) => ({ ...f, vatRate: e.target.value }))}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">
                    = {(Number(accountForm.vatRate) * 100).toFixed(0)}% VAT
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter as decimal: 0.20 = 20%, 0.05 = 5%</p>
              </div>
            </div>

            <button
              onClick={saveAccount}
              disabled={accountLoading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {accountLoading ? "Saving…" : accountSaved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {productModal.open && (
        <ProductModal
          product={productModal.item}
          categories={categories}
          onSave={(form) => saveProduct(form, productModal.item?.id)}
          onClose={() => setProductModal({ open: false, item: null })}
        />
      )}
      {opModal.open && (
        <OperationModal
          operation={opModal.item}
          categories={categories}
          onSave={(form) => saveOperation(form, opModal.item?.id)}
          onClose={() => setOpModal({ open: false, item: null })}
        />
      )}
      {catModal.open && (
        <CategoryModal
          category={catModal.item}
          onSave={(name, sortOrder) => saveCategory(name, sortOrder, catModal.item?.id)}
          onClose={() => setCatModal({ open: false, item: null })}
        />
      )}
      {deleteModal && (
        <DeleteModal
          label={deleteModal.label}
          onConfirm={deleteModal.onConfirm}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product list view
// ---------------------------------------------------------------------------
function ProductList({
  groups,
  onEdit,
  onDelete,
}: {
  groups: { label: string; items: Product[] }[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No products yet. Tap Add to create your first one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50 shadow-sm">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    {!p.active && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.thickness && (
                      <span className="text-xs text-gray-400">{p.thickness}</span>
                    )}
                    <span className="text-xs text-blue-600 font-medium">
                      ${fmt(p.sell_price)} {unitLabel(p.unit)}
                    </span>
                    {p.cost_price > 0 && (
                      <span className="text-xs text-gray-300">
                        cost ${fmt(p.cost_price)}
                      </span>
                    )}
                  </div>
                  {(p.min_width_mm || p.max_width_mm) && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      W: {p.min_width_mm ?? "—"}–{p.max_width_mm ?? "—"}mm
                      {" · "}
                      H: {p.min_height_mm ?? "—"}–{p.max_height_mm ?? "—"}mm
                    </p>
                  )}
                  {(p.min_m2 || p.pattern_name) && (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {p.min_m2 && (
                        <span className="text-[10px] font-medium bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                          min {p.min_m2}m²
                        </span>
                      )}
                      {p.pattern_name && (
                        <span className="text-[10px] font-medium bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                          {p.pattern_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(p)}
                    className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Operation list view
// ---------------------------------------------------------------------------
function OperationList({
  groups,
  onEdit,
  onDelete,
}: {
  groups: { label: string; items: Operation[] }[];
  onEdit: (o: Operation) => void;
  onDelete: (o: Operation) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No operations yet. Tap Add to create your first one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50 shadow-sm">
            {items.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.name}</p>
                    {!o.active && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-blue-600 font-medium">
                      ${fmt(o.sell_price)} {unitLabel(o.unit)}
                    </span>
                    {o.cost_price > 0 && (
                      <span className="text-xs text-gray-300">cost ${fmt(o.cost_price)}</span>
                    )}
                  </div>
                  {o.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{o.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(o)}
                    className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(o)}
                    className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category list view
// ---------------------------------------------------------------------------
function CategoryList({
  categories,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No categories yet. Tap Add to create your first one.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50 shadow-sm">
      {categories.map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{c.name}</p>
            <p className="text-xs text-gray-400">Sort: {c.sort_order}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(c)}
              className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(c)}
              className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
