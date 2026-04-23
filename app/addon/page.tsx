"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Product = {
  id: number; name: string; description?: string; thickness?: string;
  unit: string; sell_price: number; category_name?: string;
  min_width_mm?: number; max_width_mm?: number;
  min_height_mm?: number; max_height_mm?: number;
  active?: boolean;
};

type Operation = {
  id: number; name: string; description?: string;
  unit: string; sell_price: number; category_name?: string;
  active?: boolean;
};

type CartItem = {
  id: string; name: string; description: string;
  unitPrice: number; quantity: number; subtotal: number;
};

// Frame deductions per type (each side, mm)
const FRAME_DEDUCTIONS: Record<string, number> = {
  "uPVC": 10, "Timber": 8, "Aluminium": 5, "Steel": 3, "None / other": 0,
};

const UNIT_LABELS: Record<string, string> = {
  m2: "m²", linear_m: "lin.m", item: "item", pane: "pane",
};

// ---------------------------------------------------------------------------
// Calculator panel — shown when a product is selected
// ---------------------------------------------------------------------------
function ProductCalculator({
  product, onAdd, onBack,
}: { product: Product; onAdd: (item: CartItem) => void; onBack: () => void }) {
  const [width, setWidth] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [frame, setFrame] = React.useState("uPVC");
  const [qty, setQty] = React.useState(1);
  const [notes, setNotes] = React.useState("");

  const deduct = FRAME_DEDUCTIONS[frame] ?? 0;
  const cutW = Math.max(0, Number(width) - deduct * 2);
  const cutH = Math.max(0, Number(height) - deduct * 2);
  const area = (cutW * cutH) / 1_000_000;
  const weightPerM2 = 2.5 * (parseFloat(product.thickness ?? "4") || 4);

  let unitQty = 1;
  if (product.unit === "m2") { unitQty = area; }
  const total = product.sell_price * unitQty * qty;
  const canAdd = product.unit !== "m2" || (Number(width) > 0 && Number(height) > 0);

  const handleAdd = () => {
    const desc = product.unit === "m2"
      ? `Cut size: ${cutW}×${cutH}mm | ${area.toFixed(3)}m² | ${(weightPerM2 * area).toFixed(1)}kg${notes ? ` | ${notes}` : ""}`
      : notes || product.description || "";
    onAdd({
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      description: desc,
      unitPrice: Number((product.sell_price * unitQty).toFixed(2)),
      quantity: qty,
      subtotal: Number(total.toFixed(2)),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-white sticky top-0">
        <button onClick={onBack} className="text-blue-600 font-medium text-sm">← Back</button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{product.name}</div>
          {product.thickness && <div className="text-xs text-gray-500">{product.thickness}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {product.unit === "m2" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Opening size (mm)</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-0.5">Width</div>
                  <input type="number" value={width} onChange={(e) => setWidth(e.target.value)}
                    placeholder="e.g. 920"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-0.5">Height</div>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 1220"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Frame type</label>
              <select value={frame} onChange={(e) => setFrame(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.keys(FRAME_DEDUCTIONS).map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <div className="text-xs text-gray-400 mt-1">−{deduct}mm each side</div>
            </div>

            {Number(width) > 0 && Number(height) > 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-1.5">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Cut size</div>
                <div className="text-2xl font-bold text-blue-900">{cutW} × {cutH} mm</div>
                <div className="flex gap-4 text-sm text-blue-700">
                  <span>{area.toFixed(3)} m²</span>
                  <span>{(weightPerM2 * area).toFixed(1)} kg</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="rounded-xl bg-gray-50 border p-3 space-y-1">
          <div className="text-xs font-semibold text-gray-500">Price</div>
          <div className="text-sm text-gray-600">
            £{product.sell_price.toFixed(2)} / {UNIT_LABELS[product.unit] ?? product.unit}
            {product.unit === "m2" && Number(width) > 0 && Number(height) > 0 && (
              <span className="ml-2 text-gray-400">× {area.toFixed(3)} m²</span>
            )}
          </div>
          <div className="text-xl font-bold text-gray-900">
            £{(product.sell_price * unitQty).toFixed(2)} each
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border text-lg font-bold flex items-center justify-center">−</button>
            <span className="text-lg font-semibold w-6 text-center">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)}
              className="w-9 h-9 rounded-full border text-lg font-bold flex items-center justify-center">+</button>
            <span className="ml-auto text-lg font-bold">£{total.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. bathroom window, obscure arctic"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="p-3 border-t bg-white">
        <button
          disabled={!canAdd}
          onClick={handleAdd}
          className="w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm"
        >
          Add to Job — £{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Operation calculator — simpler, just qty × price or linear metres
// ---------------------------------------------------------------------------
function OperationCalculator({
  op, onAdd, onBack,
}: { op: Operation; onAdd: (item: CartItem) => void; onBack: () => void }) {
  const [metres, setMetres] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [notes, setNotes] = React.useState("");

  const unitQty = op.unit === "linear_m" ? (Number(metres) || 0) : qty;
  const total = op.sell_price * unitQty;

  const handleAdd = () => {
    onAdd({
      id: `op-${op.id}-${Date.now()}`,
      name: op.name,
      description: notes || op.description || "",
      unitPrice: op.sell_price,
      quantity: unitQty,
      subtotal: Number(total.toFixed(2)),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-white sticky top-0">
        <button onClick={onBack} className="text-blue-600 font-medium text-sm">← Back</button>
        <div className="font-semibold text-sm">{op.name}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="rounded-xl bg-gray-50 border p-3">
          <div className="text-sm text-gray-600">£{op.sell_price.toFixed(2)} per {UNIT_LABELS[op.unit] ?? op.unit}</div>
        </div>

        {op.unit === "linear_m" ? (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Length (metres)</label>
            <input type="number" step="0.1" value={metres} onChange={(e) => setMetres(e.target.value)}
              placeholder="e.g. 2.4"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border text-lg font-bold flex items-center justify-center">−</button>
              <span className="text-lg font-semibold w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 rounded-full border text-lg font-bold flex items-center justify-center">+</button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="p-3 border-t bg-white">
        <button
          disabled={unitQty <= 0}
          onClick={handleAdd}
          className="w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm"
        >
          Add to Job — £{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main add-on page
// ---------------------------------------------------------------------------
export default function AddonPage() {
  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"products" | "operations">("products");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [operations, setOperations] = React.useState<Operation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Product | Operation | null>(null);
  const [selectedType, setSelectedType] = React.useState<"product" | "operation">("product");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [pushing, setPushing] = React.useState(false);
  const [jobUuid, setJobUuid] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showCart, setShowCart] = React.useState(false);
  const [pushed, setPushed] = React.useState(false);

  // Read session token and job UUID from URL / SM context
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sess = params.get("session");
    const job = params.get("job_uuid") ?? params.get("jobUuid");
    const err = params.get("error");

    if (err) setError("Authentication failed — please reinstall the add-on.");
    if (sess) {
      setSessionToken(sess);
      sessionStorage.setItem("sm_session", sess);
    } else {
      const stored = sessionStorage.getItem("sm_session");
      if (stored) setSessionToken(stored);
    }
    if (job) setJobUuid(job);
  }, []);

  // Load products + operations once we have a session
  React.useEffect(() => {
    if (!sessionToken) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${sessionToken}` };
    Promise.all([
      fetch("/api/sm/products", { headers }).then((r) => r.json()),
      fetch("/api/sm/operations", { headers }).then((r) => r.json()),
    ]).then(([prods, ops]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setOperations(Array.isArray(ops) ? ops : []);
    }).catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  }, [sessionToken]);

  const addToCart = (item: CartItem) => {
    setCart((c) => [...c, item]);
    setSelected(null);
  };

  const pushToJob = async () => {
    if (!sessionToken || !jobUuid || cart.length === 0) return;
    setPushing(true);
    try {
      await fetch("/api/sm/push-items", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ jobUuid, items: cart.map((i) => ({ name: i.name, description: i.description, unitPrice: i.unitPrice, quantity: i.quantity })) }),
      });
      setPushed(true);
      setCart([]);
      setShowCart(false);
    } catch {
      setError("Failed to push items to job.");
    } finally {
      setPushing(false);
    }
  };

  // Group by category
  function groupByCategory<T extends { category_name?: string }>(items: T[]) {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      const cat = item.category_name ?? "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }

  const q = search.toLowerCase();
  const filteredProducts = products.filter((p) => p.active !== false && (q ? p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q) : true));
  const filteredOps = operations.filter((o) => o.active !== false && (q ? o.name.toLowerCase().includes(q) || (o.description ?? "").toLowerCase().includes(q) : true));

  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (pushed) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <div className="text-4xl mb-3">✓</div>
          <div className="font-bold text-lg">Items added to job</div>
          <div className="text-sm text-gray-500 mt-1">Switch back to ServiceM8 to review</div>
          <button onClick={() => setPushed(false)} className="mt-4 text-blue-600 text-sm">Add more items</button>
        </div>
      </div>
    );
  }

  // Calculator view
  if (selected) {
    if (selectedType === "product") {
      return <ProductCalculator product={selected as Product} onAdd={addToCart} onBack={() => setSelected(null)} />;
    }
    return <OperationCalculator op={selected as Operation} onAdd={addToCart} onBack={() => setSelected(null)} />;
  }

  // Cart view
  if (showCart) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-2 p-3 border-b bg-white sticky top-0">
          <button onClick={() => setShowCart(false)} className="text-blue-600 font-medium text-sm">← Back</button>
          <div className="font-semibold text-sm">Items to add ({cart.length})</div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {cart.map((item, i) => (
            <div key={item.id} className="p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                {item.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</div>}
                <div className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold">£{item.subtotal.toFixed(2)}</div>
                <button onClick={() => setCart((c) => c.filter((_, j) => j !== i))} className="text-red-400 text-lg leading-none">×</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t bg-white space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span><span>£{cartTotal.toFixed(2)}</span>
          </div>
          {jobUuid ? (
            <button onClick={() => void pushToJob()} disabled={pushing}
              className="w-full bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm">
              {pushing ? "Adding to job…" : `Add ${cart.length} item${cart.length !== 1 ? "s" : ""} to Job`}
            </button>
          ) : (
            <div className="text-xs text-amber-600 text-center">No job context — open from a ServiceM8 job to push items.</div>
          )}
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-3 pt-3 pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-base text-gray-900">Coglass Glass Tools</div>
          {cart.length > 0 && (
            <button onClick={() => setShowCart(true)}
              className="relative bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              Cart ({cart.length}) · £{cartTotal.toFixed(2)}
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex">
          {(["products", "operations"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
              {t === "products" ? "Products" : "Operations"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-white border-b">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "products" ? "Search glass, units…" : "Search edges, bars…"}
          className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : tab === "products" ? (
          Object.entries(groupByCategory(filteredProducts)).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-100 sticky top-0">{cat}</div>
              {items.map((p) => (
                <button key={p.id} onClick={() => { setSelected(p); setSelectedType("product"); }}
                  className="w-full flex items-center px-3 py-3 bg-white border-b text-left hover:bg-blue-50 active:bg-blue-100">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                    {p.thickness && <div className="text-xs text-gray-400">{p.thickness}</div>}
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900">£{p.sell_price.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">/{UNIT_LABELS[p.unit] ?? p.unit}</div>
                  </div>
                  <div className="ml-2 text-gray-300">›</div>
                </button>
              ))}
            </div>
          ))
        ) : (
          Object.entries(groupByCategory(filteredOps)).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-100 sticky top-0">{cat}</div>
              {items.map((o) => (
                <button key={o.id} onClick={() => { setSelected(o); setSelectedType("operation"); }}
                  className="w-full flex items-center px-3 py-3 bg-white border-b text-left hover:bg-blue-50 active:bg-blue-100">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{o.name}</div>
                    {o.description && <div className="text-xs text-gray-400 truncate">{o.description}</div>}
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900">£{o.sell_price.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">/{UNIT_LABELS[o.unit] ?? o.unit}</div>
                  </div>
                  <div className="ml-2 text-gray-300">›</div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
