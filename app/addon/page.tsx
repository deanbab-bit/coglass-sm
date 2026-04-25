"use client";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
  id: number; name: string; description?: string; thickness?: string;
  unit: string; sell_price: number; category_name?: string;
  min_width_mm?: number; max_width_mm?: number;
  min_height_mm?: number; max_height_mm?: number;
  min_m2?: number | null; pattern_name?: string | null;
  active?: boolean;
};
type Operation = {
  id: number; name: string; description?: string;
  unit: string; sell_price: number; category_name?: string;
  active?: boolean;
};
type EdgeSides = { top: boolean; right: boolean; bottom: boolean; left: boolean };
type WBRow = {
  id: string; rowType: "glass" | "operation" | "custom";
  name: string; description: string; qty: number;
  width_mm?: number; height_mm?: number;
  area_m2?: number; min_area_m2?: number;
  unit: string; unit_price: number;
  // Glass features
  notes?: string; toughened?: boolean; laminated?: boolean;
  pattern?: string; corners?: "square" | "round";
  edges?: EdgeSides; edge_op_name?: string; edge_op_price?: number;
  isEdgeRow?: boolean; // special flag — edge work child row
};
type AccountInfo = {
  company_name?: string; supplier_name?: string;
  supplier_email?: string; supplier_phone?: string; vat_rate?: number;
};
type Panel =
  | { type: "product-search" }
  | { type: "product-calc"; product: Product }
  | { type: "op-search" }
  | { type: "op-calc"; op: Operation }
  | { type: "georgian" }
  | { type: "edge-prompt"; glassRow: WBRow; ops: Operation[] };

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = "#004A66";
const BLUE = "#008BF5";
const GREEN = "#16a34a";
const FRAME_DED: Record<string, number> = {
  "uPVC": 10, "Timber": 8, "Aluminium": 5, "Steel": 3, "None / other": 0,
};
const PATTERNS = ["Obscure No.4", "Satin", "Flemish", "Reeded", "Everglade", "Arctic", "Stippolyte", "Custom…"];

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rowTotal(r: WBRow): number {
  if (r.rowType === "glass" && r.area_m2 !== undefined) {
    return Math.max(r.area_m2, r.min_area_m2 ?? 0) * r.qty * r.unit_price;
  }
  return r.qty * r.unit_price;
}
function edgePerimeter(r: WBRow, edges: EdgeSides): number {
  const w = (r.width_mm ?? 0) / 1000;
  const h = (r.height_mm ?? 0) / 1000;
  return (edges.top ? w : 0) + (edges.right ? h : 0) + (edges.bottom ? w : 0) + (edges.left ? h : 0);
}
function edgeSideCount(e: EdgeSides) { return [e.top, e.right, e.bottom, e.left].filter(Boolean).length; }
function groupBy<T extends { category_name?: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((g, item) => {
    const k = item.category_name ?? "Other";
    return { ...g, [k]: [...(g[k] ?? []), item] };
  }, {} as Record<string, T[]>);
}

// ─── Edge Picker ─────────────────────────────────────────────────────────────
function EdgePicker({ edges, onChange }: { edges: EdgeSides; onChange: (e: EdgeSides) => void }) {
  const toggle = (s: keyof EdgeSides) => onChange({ ...edges, [s]: !edges[s] });
  const W = 140, H = 100, P = 18, S = 10;
  const col = (active: boolean) => active ? BLUE : "#e2e8f0";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ cursor: "pointer", display: "block" }}>
      {/* Top */}
      <line x1={P} y1={P} x2={W-P} y2={P} stroke={col(edges.top)} strokeWidth={S} strokeLinecap="round"
        onClick={() => toggle("top")} style={{ cursor: "pointer" }} />
      {/* Right */}
      <line x1={W-P} y1={P} x2={W-P} y2={H-P} stroke={col(edges.right)} strokeWidth={S} strokeLinecap="round"
        onClick={() => toggle("right")} style={{ cursor: "pointer" }} />
      {/* Bottom */}
      <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke={col(edges.bottom)} strokeWidth={S} strokeLinecap="round"
        onClick={() => toggle("bottom")} style={{ cursor: "pointer" }} />
      {/* Left */}
      <line x1={P} y1={P} x2={P} y2={H-P} stroke={col(edges.left)} strokeWidth={S} strokeLinecap="round"
        onClick={() => toggle("left")} style={{ cursor: "pointer" }} />
      <text x={W/2} y={H/2+4} textAnchor="middle" fontSize={10} fill="#94a3b8">
        {edgeSideCount(edges)} side{edgeSideCount(edges) !== 1 ? "s" : ""}
      </text>
    </svg>
  );
}

// ─── Georgian SVG Preview ─────────────────────────────────────────────────────
function GBPreview({ refW, refH, vBars, hBars }: { refW: number; refH: number; vBars: number[]; hBars: number[] }) {
  const arrowId = React.useId();
  const w = refW > 0 ? refW : 1000, h = refH > 0 ? refH : 1000;
  const MAX = 260, ratio = w / h;
  const pxH = ratio >= 1 ? Math.max(140, Math.round(MAX / ratio)) : MAX;
  const bs = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  const barS = Math.max(2, Math.round(Math.min(w, h) * 0.005));
  const corner = Math.max(14, Math.min(40, Math.round(Math.min(w, h) * 0.03)));
  const fs = Math.max(14, Math.round(Math.min(w, h) * 0.022));
  const ds = Math.max(1, Math.round(bs * 0.6));
  const gap = Math.max(16, Math.round(Math.min(w, h) * 0.05));
  const mg = Math.max(28, gap + fs * 2);
  const outerW = w + mg * 2, outerH = h + mg * 2;
  const x0 = mg, y0 = mg, dimY = y0 + h + gap, dimX = x0 + w + gap;
  const dim = "#64748b";
  const vbs = [...vBars].sort((a, b) => a - b);
  const hbs = [...hBars].sort((a, b) => a - b);
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-xs font-semibold text-gray-600">Preview</span>
        <span className="text-xs text-gray-400 tabular-nums">{vbs.length + 1}×{hbs.length + 1} grid</span>
      </div>
      <div className="bg-white p-2">
        <svg viewBox={`0 0 ${outerW} ${outerH}`} style={{ width: "100%", height: pxH, display: "block" }} aria-label="Georgian bar preview">
          <defs>
            <marker id={arrowId} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 z" fill={dim} />
            </marker>
          </defs>
          <rect x={x0} y={y0} width={w} height={h} rx={corner} fill={`${BLUE}10`} />
          <rect x={x0+bs/2} y={y0+bs/2} width={w-bs} height={h-bs} rx={corner} fill="none" stroke={`${TEAL}88`} strokeWidth={bs} />
          {vbs.map((x, i) => <line key={`v${i}`} x1={x0+x} y1={y0+bs} x2={x0+x} y2={y0+h-bs} stroke={TEAL} strokeWidth={barS} strokeLinecap="round" />)}
          {hbs.map((y, i) => <line key={`h${i}`} x1={x0+bs} y1={y0+y} x2={x0+w-bs} y2={y0+y} stroke={TEAL} strokeWidth={barS} strokeLinecap="round" />)}
          <line x1={x0} y1={dimY} x2={x0+w} y2={dimY} stroke={dim} strokeWidth={ds} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
          <line x1={x0} y1={y0+h} x2={x0} y2={dimY} stroke={dim} strokeWidth={ds} opacity={0.35} />
          <line x1={x0+w} y1={y0+h} x2={x0+w} y2={dimY} stroke={dim} strokeWidth={ds} opacity={0.35} />
          <text x={x0+w/2} y={dimY - Math.max(6, ds*2)} textAnchor="middle" fontSize={fs} fill={dim}>{Math.round(w)}mm</text>
          <line x1={dimX} y1={y0} x2={dimX} y2={y0+h} stroke={dim} strokeWidth={ds} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
          <line x1={x0+w} y1={y0} x2={dimX} y2={y0} stroke={dim} strokeWidth={ds} opacity={0.35} />
          <line x1={x0+w} y1={y0+h} x2={dimX} y2={y0+h} stroke={dim} strokeWidth={ds} opacity={0.35} />
          <text x={dimX + Math.max(10, ds*3)} y={y0+h/2} textAnchor="middle" fontSize={fs} fill={dim}
            transform={`rotate(-90 ${dimX + Math.max(10, ds*3)} ${y0+h/2})`}>{Math.round(h)}mm</text>
        </svg>
      </div>
    </div>
  );
}

// ─── ProductCalcPanel ─────────────────────────────────────────────────────────
function ProductCalcPanel({ product, onAdd, onBack, linearOps }: {
  product: Product; onAdd: (r: WBRow) => void; onBack: () => void; linearOps: Operation[];
}) {
  const [w, setW] = React.useState("");
  const [h, setH] = React.useState("");
  const [frame, setFrame] = React.useState("uPVC");
  const [qty, setQty] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [toughened, setToughened] = React.useState(false);
  const [laminated, setLaminated] = React.useState(false);
  const [pattern, setPattern] = React.useState("");
  const [customPattern, setCustomPattern] = React.useState("");
  const [corners, setCorners] = React.useState<"square" | "round">("square");
  const [addEdges, setAddEdges] = React.useState(false);
  const [edges, setEdges] = React.useState<EdgeSides>({ top: true, right: true, bottom: true, left: true });
  const [edgeOpId, setEdgeOpId] = React.useState<number>(linearOps[0]?.id ?? 0);

  const ded = FRAME_DED[frame] ?? 0;
  const cutW = Math.max(0, Number(w) - ded * 2);
  const cutH = Math.max(0, Number(h) - ded * 2);
  const area = (cutW * cutH) / 1_000_000;
  const effArea = Math.max(area, product.min_m2 ?? 0);
  const isM2 = product.unit === "m2";
  const glassTotal = isM2 ? effArea * qty * product.sell_price : qty * product.sell_price;
  const isBelowMin = isM2 && product.min_m2 != null && area < product.min_m2 && area > 0;
  const canAdd = !isM2 || (cutW > 0 && cutH > 0);

  const edgeOp = linearOps.find(o => o.id === edgeOpId);
  const perim = addEdges && edgeOp && cutW > 0 && cutH > 0
    ? edgePerimeter({ id: "", rowType: "glass", name: "", description: "", qty, unit: "m2", unit_price: 0, width_mm: cutW, height_mm: cutH }, edges)
    : 0;
  const edgeTotal = perim * qty * (edgeOp?.sell_price ?? 0);

  const patternVal = pattern === "Custom…" ? customPattern : pattern;

  const handleAdd = () => {
    const specParts: string[] = [];
    if (isM2) specParts.push(`${cutW}×${cutH}mm | ${effArea.toFixed(3)} m²`);
    if (toughened) specParts.push("Toughened");
    if (laminated) specParts.push("Laminated");
    if (patternVal) specParts.push(patternVal);
    if (corners === "round") specParts.push("Round corners");
    if (notes) specParts.push(notes);
    const glassRow: WBRow = {
      id: uid(), rowType: "glass", name: product.name,
      description: specParts.join(" | "),
      qty, width_mm: isM2 ? cutW : undefined, height_mm: isM2 ? cutH : undefined,
      area_m2: isM2 ? area : undefined,
      min_area_m2: (product.min_m2 != null && product.min_m2 > 0) ? product.min_m2 : undefined,
      unit: product.unit, unit_price: product.sell_price,
      notes, toughened: toughened || undefined, laminated: laminated || undefined,
      pattern: patternVal || undefined, corners: corners === "round" ? "round" : undefined,
    };
    onAdd(glassRow);
    if (addEdges && edgeOp && perim > 0) {
      const sideNames = [edges.top && "Top", edges.right && "Right", edges.bottom && "Bottom", edges.left && "Left"].filter(Boolean).join(", ");
      const edgeRow: WBRow = {
        id: uid(), rowType: "operation", name: edgeOp.name,
        description: `${sideNames} — ${perim.toFixed(2)} lin.m × ${qty} pane${qty !== 1 ? "s" : ""}`,
        qty: Number((perim * qty).toFixed(3)),
        unit: "linear_m", unit_price: edgeOp.sell_price, isEdgeRow: true,
      };
      onAdd(edgeRow);
    }
  };

  const inputCls = "w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";
  const lCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ background: TEAL }}>
        <button onClick={onBack} className="text-white/70 text-sm font-medium shrink-0">← Back</button>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-white truncate">{product.name}</div>
          {product.thickness && <div className="text-xs text-white/60">{product.thickness}</div>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Dimensions */}
        {isM2 && (
          <>
            <div>
              <label className={lCls}>Opening size (mm)</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Width</div>
                  <input type="number" value={w} onChange={e => setW(e.target.value)} placeholder="920" className={inputCls} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Height</div>
                  <input type="number" value={h} onChange={e => setH(e.target.value)} placeholder="1220" className={inputCls} />
                </div>
              </div>
            </div>
            <div>
              <label className={lCls}>Frame type</label>
              <select value={frame} onChange={e => setFrame(e.target.value)} className={inputCls}>
                {Object.keys(FRAME_DED).map(f => <option key={f}>{f}</option>)}
              </select>
              <div className="text-xs text-gray-400 mt-1">−{ded}mm each side</div>
            </div>
            {cutW > 0 && cutH > 0 && (
              <div className="rounded-xl p-4 space-y-1" style={{ background: `${BLUE}12`, border: `1.5px solid ${BLUE}35` }}>
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BLUE }}>Cut size</div>
                <div className="text-2xl font-bold" style={{ color: TEAL }}>{cutW} × {cutH} mm</div>
                <div className="flex gap-4 text-sm font-medium" style={{ color: TEAL }}>
                  <span>{area.toFixed(3)} m²</span>
                  {isBelowMin && <span className="font-bold text-orange-600">MIN {product.min_m2?.toFixed(3)} m²</span>}
                  <span>{(2.5 * (parseFloat(product.thickness ?? "4") || 4) * effArea).toFixed(1)} kg</span>
                </div>
              </div>
            )}
          </>
        )}
        {/* Price */}
        <div className="rounded-xl bg-gray-50 border p-3">
          <div className="text-xs text-gray-500 mb-0.5">Unit price</div>
          <div className="text-lg font-bold text-gray-900">
            £{product.sell_price.toFixed(2)} / {isM2 ? "m²" : product.unit === "linear_m" ? "lin.m" : product.unit}
          </div>
          {product.min_m2 != null && product.min_m2 > 0 && (
            <div className="text-xs text-orange-600 mt-0.5">Min charge: {product.min_m2.toFixed(3)} m² (£{(product.sell_price * product.min_m2).toFixed(2)})</div>
          )}
        </div>
        {/* Qty */}
        <div>
          <label className={lCls}>Quantity</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border-2 text-xl font-bold text-gray-600 flex items-center justify-center">−</button>
            <span className="text-xl font-bold w-8 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-full border-2 text-xl font-bold text-gray-600 flex items-center justify-center">+</button>
            <span className="ml-auto text-xl font-bold text-gray-900">£{glassTotal.toFixed(2)}</span>
          </div>
        </div>
        {/* Glass features */}
        <div>
          <label className={lCls}>Glass features</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={toughened} onChange={e => setToughened(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
              <div>
                <div className="text-sm font-medium text-gray-800">Toughened</div>
                <div className="text-xs text-gray-400">Heat-strengthened safety glass</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={laminated} onChange={e => setLaminated(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
              <div>
                <div className="text-sm font-medium text-gray-800">Laminated</div>
                <div className="text-xs text-gray-400">PVB interlayer safety glass</div>
              </div>
            </label>
          </div>
        </div>
        {/* Pattern */}
        <div>
          <label className={lCls}>Pattern / Obscure</label>
          <select value={pattern} onChange={e => setPattern(e.target.value)} className={inputCls}>
            <option value="">— None (clear) —</option>
            {PATTERNS.map(p => <option key={p}>{p}</option>)}
          </select>
          {pattern === "Custom…" && (
            <input value={customPattern} onChange={e => setCustomPattern(e.target.value)}
              placeholder="Pattern name" className={`${inputCls} mt-2`} />
          )}
        </div>
        {/* Corners */}
        {isM2 && (
          <div>
            <label className={lCls}>Corners</label>
            <div className="flex gap-2">
              {(["square", "round"] as const).map(c => (
                <button key={c} onClick={() => setCorners(c)}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold capitalize transition-colors ${corners === c ? "text-white" : "text-gray-600"}`}
                  style={corners === c ? { background: TEAL, borderColor: TEAL } : { borderColor: "#e2e8f0" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Edge work */}
        {isM2 && linearOps.length > 0 && (
          <div>
            <label className="flex items-center gap-3 mb-3 cursor-pointer">
              <input type="checkbox" checked={addEdges} onChange={e => setAddEdges(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
              <span className={lCls.replace("mb-1.5", "mb-0")}>Add edge work</span>
            </label>
            {addEdges && (
              <div className="space-y-3 pl-1">
                <div className="flex items-start gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Tap sides to include</div>
                    <EdgePicker edges={edges} onChange={setEdges} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1.5">Operation</div>
                    <select value={edgeOpId} onChange={e => setEdgeOpId(Number(e.target.value))}
                      className="w-full border rounded-lg px-2 py-2 text-sm bg-white">
                      {linearOps.map(o => <option key={o.id} value={o.id}>{o.name} £{o.sell_price.toFixed(2)}/m</option>)}
                    </select>
                    {cutW > 0 && cutH > 0 && (
                      <div className="text-xs text-gray-500 mt-1.5">
                        {perim.toFixed(2)} lin.m × {qty} = {(perim * qty).toFixed(2)} m<br />
                        <span className="font-semibold text-gray-700">Edge total: £{edgeTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Notes */}
        <div>
          <label className={lCls}>Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. bathroom window, ground floor" className={inputCls} />
        </div>
      </div>
      <div className="p-4 border-t bg-white shrink-0">
        <button disabled={!canAdd} onClick={handleAdd}
          className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
          style={{ background: BLUE }}>
          Add to Workbench — £{(glassTotal + edgeTotal).toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ─── OperationCalcPanel ───────────────────────────────────────────────────────
function OperationCalcPanel({ op, onAdd, onBack }: { op: Operation; onAdd: (r: WBRow) => void; onBack: () => void }) {
  const [metres, setMetres] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const isLinear = op.unit === "linear_m";
  const unitQty = isLinear ? (Number(metres) || 0) : qty;
  const total = op.sell_price * unitQty;
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ background: TEAL }}>
        <button onClick={onBack} className="text-white/70 text-sm font-medium shrink-0">← Back</button>
        <div className="font-semibold text-sm text-white truncate">{op.name}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl bg-gray-50 border p-3">
          <div className="text-xs text-gray-500">Unit price</div>
          <div className="text-lg font-bold text-gray-900">
            £{op.sell_price.toFixed(2)} / {isLinear ? "lin.m" : op.unit}
          </div>
        </div>
        {isLinear ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Length (metres)</label>
            <input type="number" step="0.1" value={metres} onChange={e => setMetres(e.target.value)}
              placeholder="e.g. 2.4" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quantity</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border-2 text-xl font-bold text-gray-600 flex items-center justify-center">−</button>
              <span className="text-xl font-bold w-8 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-full border-2 text-xl font-bold text-gray-600 flex items-center justify-center">+</button>
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes…" className="w-full border rounded-lg px-3 py-2.5 text-sm" />
        </div>
      </div>
      <div className="p-4 border-t bg-white shrink-0">
        <button disabled={unitQty <= 0} onClick={() => onAdd({
          id: uid(), rowType: "operation", name: op.name,
          description: notes || op.description || "", qty: unitQty,
          unit: op.unit, unit_price: op.sell_price,
        })}
          className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
          style={{ background: BLUE }}>
          Add to Workbench — £{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ─── GeorgianBarsPanel ────────────────────────────────────────────────────────
function GeorgianBarsPanel({ glassProducts, onAddPanes, onBack }: {
  glassProducts: Product[]; onAddPanes: (rows: WBRow[]) => void; onBack: () => void;
}) {
  const [productId, setProductId] = React.useState<number>(glassProducts[0]?.id ?? 0);
  const [openW, setOpenW] = React.useState(""); const [openH, setOpenH] = React.useState("");
  const [frame, setFrame] = React.useState("uPVC");
  const [cols, setCols] = React.useState(2); const [rows, setRows] = React.useState(2);
  const [vBars, setVBars] = React.useState<number[]>([500]);
  const [hBars, setHBars] = React.useState<number[]>([500]);
  const [windows, setWindows] = React.useState(1);
  const product = glassProducts.find(p => p.id === productId);
  const ded = FRAME_DED[frame] ?? 0;
  const cutW = Math.max(0, Number(openW) - ded * 2);
  const cutH = Math.max(0, Number(openH) - ded * 2);
  const refW = cutW > 0 ? cutW : 1000, refH = cutH > 0 ? cutH : 1000;
  const vCount = Math.max(0, cols - 1), hCount = Math.max(0, rows - 1);
  function defaultBars(count: number, total: number) { return Array.from({ length: count }, (_, i) => total * (i + 1) / (count + 1)); }
  const vNorm = vBars.slice(0, vCount).map(x => Math.max(0, Math.min(refW, x))).sort((a, b) => a - b);
  const hNorm = hBars.slice(0, hCount).map(y => Math.max(0, Math.min(refH, y))).sort((a, b) => a - b);
  const handleSetCols = (c: number) => { const n = Math.max(1, Math.min(12, c)); setCols(n); setVBars(defaultBars(n - 1, refW)); };
  const handleSetRows = (r: number) => { const n = Math.max(1, Math.min(12, r)); setRows(n); setHBars(defaultBars(n - 1, refH)); };
  const setVBar = (i: number, x: number) => { const next = [...vBars]; next[i] = Math.max(0, Math.min(refW, isNaN(x) ? vNorm[i] : x)); setVBars([...next].sort((a, b) => a - b)); };
  const setHBar = (i: number, y: number) => { const next = [...hBars]; next[i] = Math.max(0, Math.min(refH, isNaN(y) ? hNorm[i] : y)); setHBars([...next].sort((a, b) => a - b)); };
  const xSegs = [0, ...vNorm, refW], ySegs = [0, ...hNorm, refH];
  const paneWidths = xSegs.slice(1).map((x, i) => Math.round(x - xSegs[i]));
  const paneHeights = ySegs.slice(1).map((y, i) => Math.round(y - ySegs[i]));
  const paneMap = new Map<string, { paneW: number; paneH: number; area: number; count: number }>();
  for (const ph of paneHeights) for (const pw of paneWidths) {
    const area = (pw * ph) / 1_000_000, key = `${pw}x${ph}`;
    const ex = paneMap.get(key); if (ex) ex.count++; else paneMap.set(key, { paneW: pw, paneH: ph, area, count: 1 });
  }
  const paneGroups = Array.from(paneMap.values());
  const totalPanes = cols * rows;
  const totalArea = paneGroups.reduce((s, g) => s + g.area * g.count, 0);
  const totalCost = product ? paneGroups.reduce((s, g) => s + g.area * g.count * windows * product.sell_price, 0) : 0;
  const canAdd = !!product && cutW > 0 && cutH > 0 && paneGroups.every(g => g.paneW > 0 && g.paneH > 0);
  const iCls = "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300";
  const lCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ background: TEAL }}>
        <button onClick={onBack} className="text-white/70 text-sm font-medium shrink-0">← Back</button>
        <div className="font-semibold text-sm text-white">Georgian Bars</div>
        <div className="ml-auto text-xs text-white/60 tabular-nums">{cols}×{rows} · {totalPanes} panes</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {glassProducts.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-12 px-6">No glass (m²) products found. Add products in Setup first.</div>
        ) : (
          <div className="p-4 space-y-5">
            <div><label className={lCls}>Glass product</label>
              <select value={productId} onChange={e => setProductId(Number(e.target.value))} className={iCls}>
                {glassProducts.map(p => <option key={p.id} value={p.id}>{p.name}{p.thickness ? ` — ${p.thickness}` : ""}</option>)}
              </select>
            </div>
            <div><label className={lCls}>Opening size (mm)</label>
              <div className="flex gap-3">
                <div className="flex-1"><div className="text-xs text-gray-400 mb-1">Width</div><input type="number" value={openW} onChange={e => setOpenW(e.target.value)} placeholder="920" className={iCls} /></div>
                <div className="flex-1"><div className="text-xs text-gray-400 mb-1">Height</div><input type="number" value={openH} onChange={e => setOpenH(e.target.value)} placeholder="1220" className={iCls} /></div>
              </div>
              {cutW > 0 && cutH > 0 && <div className="text-xs text-gray-400 mt-1">Cut size: {cutW} × {cutH}mm (−{ded}mm per side)</div>}
            </div>
            <div><label className={lCls}>Frame type</label>
              <select value={frame} onChange={e => setFrame(e.target.value)} className={iCls}>
                {Object.keys(FRAME_DED).map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div><label className={lCls}>Grid</label>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-gray-400 mb-1">Columns (squares across)</div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleSetCols(cols - 1)} className="w-8 h-8 rounded-full border font-bold text-gray-600 flex items-center justify-center shrink-0">−</button>
                    <input type="number" min={1} max={12} value={cols} onChange={e => handleSetCols(Number(e.target.value))} className="w-14 border rounded-lg px-2 py-2 text-sm text-center" />
                    <button onClick={() => handleSetCols(cols + 1)} className="w-8 h-8 rounded-full border font-bold text-gray-600 flex items-center justify-center shrink-0">+</button>
                  </div>
                </div>
                <div><div className="text-xs text-gray-400 mb-1">Rows (squares down)</div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleSetRows(rows - 1)} className="w-8 h-8 rounded-full border font-bold text-gray-600 flex items-center justify-center shrink-0">−</button>
                    <input type="number" min={1} max={12} value={rows} onChange={e => handleSetRows(Number(e.target.value))} className="w-14 border rounded-lg px-2 py-2 text-sm text-center" />
                    <button onClick={() => handleSetRows(rows + 1)} className="w-8 h-8 rounded-full border font-bold text-gray-600 flex items-center justify-center shrink-0">+</button>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1.5">{totalPanes} squares total</div>
            </div>
            <GBPreview refW={refW} refH={refH} vBars={vNorm} hBars={hNorm} />
            {vCount > 0 && <div><label className={lCls}>Vertical bar positions (mm from left)</label>
              <div className="grid grid-cols-2 gap-2">
                {vNorm.map((x, i) => <div key={i}><div className="text-xs text-gray-500 mb-1">Bar {i + 1}</div>
                  <input type="number" min={0} max={refW} value={Math.round(x)} onChange={e => setVBar(i, e.target.value === "" ? x : Number(e.target.value))} className={iCls} /></div>)}
              </div></div>}
            {hCount > 0 && <div><label className={lCls}>Horizontal bar positions (mm from top)</label>
              <div className="grid grid-cols-2 gap-2">
                {hNorm.map((y, i) => <div key={i}><div className="text-xs text-gray-500 mb-1">Bar {i + 1}</div>
                  <input type="number" min={0} max={refH} value={Math.round(y)} onChange={e => setHBar(i, e.target.value === "" ? y : Number(e.target.value))} className={iCls} /></div>)}
              </div></div>}
            {cutW > 0 && cutH > 0 && paneGroups.length > 0 && (
              <div><label className={lCls}>Pane cut sizes</label>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <div className="flex text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 px-3 py-2 border-b">
                    <span className="flex-1">Cut size</span><span className="w-20 text-right">m²</span><span className="w-12 text-right">Qty</span>
                  </div>
                  {paneGroups.map(g => (
                    <div key={`${g.paneW}x${g.paneH}`} className="flex items-center px-3 py-2 border-b last:border-b-0 text-sm">
                      <span className="flex-1 font-medium">{g.paneW}×{g.paneH}mm</span>
                      <span className="w-20 text-right text-gray-500">{g.area.toFixed(3)}</span>
                      <span className="w-12 text-right text-gray-400">×{g.count}</span>
                    </div>
                  ))}
                  <div className="flex items-center px-3 py-2 text-sm font-semibold border-t bg-gray-50">
                    <span className="flex-1 text-gray-600">Total</span>
                    <span className="text-gray-800">{totalArea.toFixed(3)} m²</span>
                  </div>
                </div>
              </div>
            )}
            <div><label className={lCls}>Number of windows</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setWindows(w => Math.max(1, w - 1))} className="w-9 h-9 rounded-full border font-bold text-gray-600 flex items-center justify-center">−</button>
                <span className="font-bold text-lg w-8 text-center">{windows}</span>
                <button onClick={() => setWindows(w => w + 1)} className="w-9 h-9 rounded-full border font-bold text-gray-600 flex items-center justify-center">+</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-white shrink-0">
        <button disabled={!canAdd} onClick={() => {
          if (!product) return;
          const newRows = paneGroups.map(g => ({
            id: uid(), rowType: "glass" as const, name: product.name,
            description: `${g.paneW}×${g.paneH}mm | ${g.area.toFixed(3)} m² | Georgian ${cols}×${rows}${g.count > 1 ? ` ×${g.count}` : ""}`,
            qty: g.count * windows, width_mm: g.paneW, height_mm: g.paneH, area_m2: g.area,
            min_area_m2: (product.min_m2 != null && product.min_m2 > 0) ? product.min_m2 : undefined,
            unit: product.unit, unit_price: product.sell_price,
          }));
          onAddPanes(newRows);
        }}
          className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
          style={{ background: BLUE }}>
          {canAdd ? `Add ${paneGroups.length} cut size${paneGroups.length !== 1 ? "s" : ""} (${totalPanes * windows} pcs) — £${totalCost.toFixed(2)}` : "Enter opening size to continue"}
        </button>
      </div>
    </div>
  );
}

// ─── ItemList ─────────────────────────────────────────────────────────────────
function ItemList<T extends { id: number; name: string; description?: string; sell_price: number; unit: string; category_name?: string; active?: boolean }>({
  items, placeholder, onSelect, unitLabel,
}: { items: T[]; placeholder: string; onSelect: (item: T) => void; unitLabel: (item: T) => string }) {
  const [q, setQ] = React.useState("");
  const lower = q.toLowerCase();
  const filtered = items.filter(i => i.active !== false && (!lower || i.name.toLowerCase().includes(lower) || (i.description ?? "").toLowerCase().includes(lower)));
  const grouped = groupBy(filtered);
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-2 bg-white border-b shrink-0">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} autoFocus
          className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">{cat}</div>
            {catItems.map(item => (
              <button key={item.id} onClick={() => onSelect(item)}
                className="w-full flex items-center px-3 py-3 bg-white border-b text-left hover:bg-blue-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                  {item.description && <div className="text-xs text-gray-400 truncate">{item.description}</div>}
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <div className="text-sm font-bold">£{item.sell_price.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">{unitLabel(item)}</div>
                </div>
                <div className="ml-2 text-gray-300 text-sm">›</div>
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && <div className="flex items-center justify-center h-32 text-sm text-gray-400">No results</div>}
      </div>
    </div>
  );
}

// ─── WorkbenchRows ────────────────────────────────────────────────────────────
function WorkbenchRows({ rows, onQty, onDelete, onMoveUp, onMoveDown, onNoteChange }: {
  rows: WBRow[];
  onQty: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="flex text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 px-3 py-2 border-b">
        <span className="flex-1">Product</span>
        <span className="w-[72px] text-center">Qty</span>
        <span className="w-14 text-right">m²</span>
        <span className="w-16 text-right">Total</span>
        <span className="w-5"></span>
      </div>
      {rows.map((r, idx) => {
        const eff = r.area_m2 !== undefined ? Math.max(r.area_m2, r.min_area_m2 ?? 0) : undefined;
        const isBelowMin = r.area_m2 !== undefined && r.min_area_m2 !== undefined && r.area_m2 < r.min_area_m2;
        const total = rowTotal(r);
        const isExp = expanded.has(r.id);
        return (
          <div key={r.id} className={`border-b last:border-b-0 ${r.isEdgeRow ? "bg-blue-50/40" : ""}`}>
            <div className="flex items-start px-3 py-2.5 gap-1">
              <div className="flex-1 min-w-0 pr-1" onClick={() => r.rowType === "glass" && toggle(r.id)} style={{ cursor: r.rowType === "glass" ? "pointer" : "default" }}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {r.isEdgeRow && <span className="text-xs text-blue-400">↳</span>}
                  <span className="text-sm font-medium text-gray-900 truncate">{r.name}</span>
                  {r.toughened && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "#fef3c7", color: "#b45309" }}>TOUGH</span>}
                  {r.laminated && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "#ede9fe", color: "#6d28d9" }}>LAM</span>}
                  {r.pattern && <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-gray-100 text-gray-600">{r.pattern}</span>}
                  {r.corners === "round" && <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-gray-100 text-gray-500">ROUND</span>}
                  {r.rowType === "operation" && !r.isEdgeRow && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: `${BLUE}15`, color: BLUE }}>op</span>}
                  {r.rowType === "custom" && <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-gray-100 text-gray-400">custom</span>}
                </div>
                {r.description && <div className="text-xs text-gray-400 truncate mt-0.5">{r.description}</div>}
                {r.notes && !isExp && <div className="text-xs text-blue-500 truncate mt-0.5 italic">&quot;{r.notes}&quot;</div>}
              </div>
              <div className="w-[72px] flex items-center gap-0.5 justify-center pt-0.5 shrink-0">
                <button onClick={() => onQty(r.id, Math.max(1, r.qty - 1))} className="w-6 h-6 rounded-full border text-xs font-bold text-gray-500 flex items-center justify-center">−</button>
                <span className="text-sm font-semibold w-5 text-center">{r.qty}</span>
                <button onClick={() => onQty(r.id, r.qty + 1)} className="w-6 h-6 rounded-full border text-xs font-bold text-gray-500 flex items-center justify-center">+</button>
              </div>
              <div className="w-14 text-right pt-0.5 shrink-0">
                {eff !== undefined ? (
                  <div>
                    <div className="text-xs font-medium text-gray-600">{eff.toFixed(3)}</div>
                    {isBelowMin && <span className="text-xs font-bold px-1 rounded" style={{ background: "#fff3e0", color: "#e65100" }}>MIN</span>}
                  </div>
                ) : <div className="text-xs text-gray-400">{r.unit === "linear_m" ? "lin.m" : r.unit}</div>}
              </div>
              <div className="w-16 text-right font-bold text-sm pt-0.5 shrink-0 text-gray-900">£{total.toFixed(2)}</div>
              <div className="w-5 shrink-0">
                <button onClick={() => onDelete(r.id)} className="text-gray-300 hover:text-red-400 text-base leading-none w-5 h-6 flex items-center justify-center">×</button>
              </div>
            </div>
            {/* Expanded: notes + reorder */}
            {isExp && (
              <div className="px-3 pb-3 space-y-2 border-t bg-gray-50/50">
                <div className="flex items-center gap-2 pt-2">
                  <input value={r.notes ?? ""} onChange={e => onNoteChange(r.id, e.target.value)}
                    placeholder="Add note for this pane…"
                    className="flex-1 bg-white border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onMoveUp(r.id)} disabled={idx === 0}
                    className="text-xs px-2.5 py-1 rounded border text-gray-500 disabled:opacity-30">↑ Move up</button>
                  <button onClick={() => onMoveDown(r.id)} disabled={idx === rows.length - 1}
                    className="text-xs px-2.5 py-1 rounded border text-gray-500 disabled:opacity-30">↓ Move down</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TotalsSection ────────────────────────────────────────────────────────────
function TotalsSection({ rows, vatRate }: { rows: WBRow[]; vatRate: number }) {
  const glassTotal = rows.filter(r => r.rowType === "glass").reduce((s, r) => s + rowTotal(r), 0);
  const opsTotal = rows.filter(r => r.rowType === "operation").reduce((s, r) => s + rowTotal(r), 0);
  const customTotal = rows.filter(r => r.rowType === "custom").reduce((s, r) => s + rowTotal(r), 0);
  const exVAT = glassTotal + opsTotal + customTotal;
  const vat = exVAT * vatRate;
  return (
    <div className="rounded-xl border bg-white overflow-hidden mt-3">
      <div className="divide-y">
        {glassTotal > 0 && <div className="flex justify-between px-4 py-2 text-sm"><span className="text-gray-500">Glass</span><span className="font-medium">£{glassTotal.toFixed(2)}</span></div>}
        {opsTotal > 0 && <div className="flex justify-between px-4 py-2 text-sm"><span className="text-gray-500">Operations</span><span className="font-medium">£{opsTotal.toFixed(2)}</span></div>}
        {customTotal > 0 && <div className="flex justify-between px-4 py-2 text-sm"><span className="text-gray-500">Other</span><span className="font-medium">£{customTotal.toFixed(2)}</span></div>}
        <div className="flex justify-between px-4 py-2.5"><span className="font-semibold text-sm">Total ex VAT</span><span className="font-bold text-sm">£{exVAT.toFixed(2)}</span></div>
        <div className="flex justify-between px-4 py-2 text-sm text-gray-400"><span>VAT ({Math.round(vatRate * 100)}%)</span><span>£{vat.toFixed(2)}</span></div>
        <div className="flex justify-between px-4 py-3.5" style={{ background: TEAL }}>
          <span className="font-bold text-sm text-white">Total incl VAT</span>
          <span className="font-bold text-sm text-white">£{(exVAT + vat).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CutSheet ────────────────────────────────────────────────────────────────
function CutSheetTab({ rows, jobUuid, account }: { rows: WBRow[]; jobUuid: string | null; account: AccountInfo }) {
  const glassRows = rows.filter(r => r.rowType === "glass");
  const opRows = rows.filter(r => r.rowType !== "glass");
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const ref = jobUuid ? `Job ${jobUuid.slice(0, 8).toUpperCase()}` : "No job ref";

  const buildEmailBody = () => {
    const lines: string[] = [
      `GLASS ORDER — ${ref}`,
      `Date: ${today}`,
      account.company_name ? `From: ${account.company_name}` : "",
      "",
      "GLASS CUTS",
      "----------",
      ...glassRows.map((r, i) => {
        const specs: string[] = [];
        if (r.toughened) specs.push("TOUGHENED");
        if (r.laminated) specs.push("LAMINATED");
        if (r.pattern) specs.push(r.pattern);
        if (r.corners === "round") specs.push("ROUND CORNERS");
        if (r.notes) specs.push(r.notes);
        return `${i + 1}. ${r.name}\n   Cut: ${r.width_mm ?? "?"}×${r.height_mm ?? "?"}mm | ${r.area_m2?.toFixed(3) ?? "?"} m² | Qty: ${r.qty}${specs.length ? `\n   Specs: ${specs.join(", ")}` : ""}`;
      }),
      "",
      opRows.length > 0 ? "OPERATIONS\n----------" : "",
      ...opRows.map((r, i) => `${i + 1}. ${r.name} — ${r.qty} ${r.unit === "linear_m" ? "lin.m" : r.unit}`),
      "",
      `Total glass area: ${glassRows.reduce((s, r) => s + (r.area_m2 ?? 0) * r.qty, 0).toFixed(3)} m²`,
      "",
      "Please confirm receipt and lead time.",
      account.company_name ?? "",
    ].filter(l => l !== undefined);

    return lines.join("\n");
  };

  const handleEmail = () => {
    const to = account.supplier_email ?? "";
    const subject = encodeURIComponent(`Glass Order — ${ref} — ${today}`);
    const body = encodeURIComponent(buildEmailBody());
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3">
        {/* Header */}
        <div className="rounded-xl border bg-white overflow-hidden mb-3">
          <div className="px-4 py-3" style={{ background: TEAL }}>
            <div className="font-bold text-white">Production Cut Sheet</div>
            <div className="text-xs text-white/70 mt-0.5">{ref} · {today}</div>
          </div>
          {account.company_name && (
            <div className="px-4 py-2 text-sm text-gray-600 border-b">{account.company_name}</div>
          )}
        </div>

        {/* Glass cuts */}
        {glassRows.length > 0 ? (
          <div className="rounded-xl border bg-white overflow-hidden mb-3">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 border-b">Glass Cuts</div>
            {glassRows.map((r, i) => (
              <div key={r.id} className="px-3 py-3 border-b last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 shrink-0">#{i + 1}</span>
                      <span className="font-semibold text-sm text-gray-900">{r.name}</span>
                      {r.toughened && <span className="text-xs px-1.5 rounded font-bold" style={{ background: "#fef3c7", color: "#b45309" }}>TOUGH</span>}
                      {r.laminated && <span className="text-xs px-1.5 rounded font-bold" style={{ background: "#ede9fe", color: "#6d28d9" }}>LAM</span>}
                      {r.pattern && <span className="text-xs px-1.5 rounded font-bold bg-gray-100 text-gray-600">{r.pattern}</span>}
                      {r.corners === "round" && <span className="text-xs px-1.5 rounded font-bold bg-gray-100 text-gray-500">ROUND</span>}
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold" style={{ color: TEAL }}>
                      {r.width_mm ?? "?"}×{r.height_mm ?? "?"}mm
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r.area_m2?.toFixed(3) ?? "?"} m² each
                      {r.min_area_m2 != null && r.area_m2! < r.min_area_m2 && (
                        <span className="ml-1 text-orange-600 font-semibold">(min {r.min_area_m2.toFixed(3)} m²)</span>
                      )}
                    </div>
                    {r.notes && <div className="text-xs text-gray-400 italic mt-0.5">Note: {r.notes}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-gray-900">×{r.qty}</div>
                    <div className="text-xs text-gray-400">{((r.area_m2 ?? 0) * r.qty).toFixed(3)} m² total</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="px-3 py-2 bg-gray-50 flex justify-between text-sm font-semibold border-t">
              <span className="text-gray-600">Total glass area</span>
              <span style={{ color: TEAL }}>{glassRows.reduce((s, r) => s + (r.area_m2 ?? 0) * r.qty, 0).toFixed(3)} m²</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-400 py-8">No glass cuts in workbench yet</div>
        )}

        {/* Operations */}
        {opRows.length > 0 && (
          <div className="rounded-xl border bg-white overflow-hidden mb-3">
            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 border-b">Operations</div>
            {opRows.map((r, i) => (
              <div key={r.id} className="flex items-center px-3 py-2.5 border-b last:border-b-0 text-sm">
                <span className="text-xs font-bold text-gray-400 mr-2">#{i + 1}</span>
                <span className="flex-1 font-medium text-gray-800">{r.name}</span>
                {r.description && <span className="text-xs text-gray-400 mr-2 truncate max-w-32">{r.description}</span>}
                <span className="font-semibold text-gray-700">{r.qty} {r.unit === "linear_m" ? "lin.m" : r.unit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Supplier email button */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="font-semibold text-sm text-gray-800">Email to Supplier</div>
          {account.supplier_email ? (
            <div className="text-xs text-gray-500">Sending to: <span className="font-medium text-gray-700">{account.supplier_name ?? account.supplier_email}</span> ({account.supplier_email})</div>
          ) : (
            <div className="text-xs text-amber-600">No supplier email set — add it in Setup → Settings.</div>
          )}
          <button onClick={handleEmail} disabled={glassRows.length === 0}
            className="w-full text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40"
            style={{ background: BLUE }}>
            {account.supplier_email ? `Email Cut Sheet to ${account.supplier_name ?? "Supplier"}` : "Open Email (no supplier set)"}
          </button>
          <div className="text-xs text-gray-400 text-center">Opens your email app pre-filled with the cut list</div>
        </div>
      </div>
    </div>
  );
}

// ─── AddonPage ────────────────────────────────────────────────────────────────
export default function AddonPage() {
  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [jobUuid, setJobUuid] = React.useState<string | null>(null);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [operations, setOperations] = React.useState<Operation[]>([]);
  const [account, setAccount] = React.useState<AccountInfo>({});
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"workbench" | "products" | "operations" | "cutsheet">("workbench");
  const [panel, setPanel] = React.useState<Panel | null>(null);
  const [wbRows, setWbRows] = React.useState<WBRow[]>([]);
  const [pushing, setPushing] = React.useState(false);
  const [pushed, setPushed] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [customName, setCustomName] = React.useState("");
  const [customPrice, setCustomPrice] = React.useState("");
  const [customQty, setCustomQty] = React.useState(1);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Load session from URL params + sessionStorage
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sess = p.get("session");
    const job = p.get("job_uuid") ?? p.get("jobUuid");
    if (p.get("error")) setAuthError("Authentication failed — please reinstall the add-on.");
    if (sess) { setSessionToken(sess); sessionStorage.setItem("sm_session", sess); }
    else { const s = sessionStorage.getItem("sm_session"); if (s) setSessionToken(s); }
    if (job) {
      setJobUuid(job);
      // Load saved workbench from localStorage
      try {
        const saved = localStorage.getItem(`cg_wb_${job}`);
        if (saved) setWbRows(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  // Auto-save workbench to localStorage when rows change
  React.useEffect(() => {
    if (!jobUuid) return;
    try { localStorage.setItem(`cg_wb_${jobUuid}`, JSON.stringify(wbRows)); } catch { /* ignore */ }
  }, [wbRows, jobUuid]);

  // Load data
  React.useEffect(() => {
    if (!sessionToken) return;
    const h = { Authorization: `Bearer ${sessionToken}` };
    Promise.all([
      fetch("/api/sm/products", { headers: h }).then(r => r.json()),
      fetch("/api/sm/operations", { headers: h }).then(r => r.json()),
      fetch("/api/sm/account", { headers: h }).then(r => r.json()).catch(() => ({})),
    ]).then(([prods, ops, acct]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setOperations(Array.isArray(ops) ? ops : []);
      setAccount(acct ?? {});
    }).catch(() => setApiError("Failed to load data."))
      .finally(() => setLoading(false));
  }, [sessionToken]);

  const addRow = (row: WBRow) => { setWbRows(r => [...r, row]); setPanel(null); setTab("workbench"); };
  const addRows = (rows: WBRow[]) => { setWbRows(r => [...r, ...rows]); setPanel(null); setTab("workbench"); };

  const mutateRows = (fn: (rows: WBRow[]) => WBRow[]) => setWbRows(fn);

  const moveRow = (id: string, dir: -1 | 1) => mutateRows(rows => {
    const i = rows.findIndex(r => r.id === id);
    if (i < 0) return rows;
    const j = i + dir;
    if (j < 0 || j >= rows.length) return rows;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const pushToJob = async () => {
    if (!sessionToken || !jobUuid || wbRows.length === 0) return;
    setPushing(true);
    try {
      await fetch("/api/sm/push-items", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUuid,
          items: wbRows.map(r => ({
            name: r.name, description: r.description, unitPrice: r.unit_price,
            quantity: r.rowType === "glass" && r.area_m2 !== undefined
              ? Number((Math.max(r.area_m2, r.min_area_m2 ?? 0) * r.qty).toFixed(4))
              : r.qty,
          })),
        }),
      });
      setPushed(true);
      // Clear saved state for this job
      if (jobUuid) { try { localStorage.removeItem(`cg_wb_${jobUuid}`); } catch { /* ignore */ } }
      setWbRows([]);
    } catch { setApiError("Failed to push items."); }
    finally { setPushing(false); }
  };

  const manualSave = () => {
    if (!jobUuid) return;
    try { localStorage.setItem(`cg_wb_${jobUuid}`, JSON.stringify(wbRows)); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { /* ignore */ }
  };

  if (authError) return (
    <div className="flex h-screen items-center justify-center p-6 text-center">
      <div><div className="text-2xl mb-2">⚠️</div><div className="text-sm text-gray-600">{authError}</div></div>
    </div>
  );

  if (pushed) return (
    <div className="flex h-screen items-center justify-center p-6 text-center" style={{ background: `${TEAL}08` }}>
      <div>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{ background: "#dcfce7" }}>✓</div>
        <div className="font-bold text-lg mb-1" style={{ color: TEAL }}>Pushed to ServiceM8</div>
        <div className="text-sm text-gray-500 mb-5">Items added to the job</div>
        <button onClick={() => setPushed(false)} className="text-sm font-semibold px-6 py-2.5 rounded-xl text-white" style={{ background: BLUE }}>Back to Workbench</button>
      </div>
    </div>
  );

  const glassProducts = products.filter(p => p.unit === "m2" && p.active !== false);
  const linearOps = operations.filter(o => o.unit === "linear_m" && o.active !== false);
  const vatRate = account.vat_rate ?? 0.20;

  // Panels (full screen overlays)
  if (panel) {
    if (panel.type === "product-search") return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ background: TEAL }}>
          <button onClick={() => setPanel(null)} className="text-white/70 text-sm font-medium shrink-0">← Back</button>
          <div className="font-semibold text-sm text-white">Add Glass Product</div>
        </div>
        <ItemList items={products} placeholder="Search glass, units…"
          onSelect={p => setPanel({ type: "product-calc", product: p })}
          unitLabel={p => p.unit === "m2" ? "/m²" : `/${p.unit}`} />
      </div>
    );
    if (panel.type === "product-calc") return (
      <div className="h-screen overflow-hidden flex flex-col">
        <ProductCalcPanel product={panel.product} linearOps={linearOps}
          onAdd={row => addRow(row)}
          onBack={() => setPanel({ type: "product-search" })} />
      </div>
    );
    if (panel.type === "op-search") return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ background: TEAL }}>
          <button onClick={() => setPanel(null)} className="text-white/70 text-sm font-medium shrink-0">← Back</button>
          <div className="font-semibold text-sm text-white">Add Operation</div>
        </div>
        <ItemList items={operations} placeholder="Search edges, bars…"
          onSelect={o => setPanel({ type: "op-calc", op: o })}
          unitLabel={o => o.unit === "linear_m" ? "/lin.m" : `/${o.unit}`} />
      </div>
    );
    if (panel.type === "op-calc") return (
      <div className="h-screen overflow-hidden flex flex-col">
        <OperationCalcPanel op={panel.op}
          onAdd={row => addRow(row)}
          onBack={() => setPanel({ type: "op-search" })} />
      </div>
    );
    if (panel.type === "georgian") return (
      <div className="h-screen overflow-hidden flex flex-col">
        <GeorgianBarsPanel glassProducts={glassProducts} onAddPanes={rows => addRows(rows)} onBack={() => setPanel(null)} />
      </div>
    );
  }

  const _wbTotal = wbRows.reduce((s, r) => s + rowTotal(r), 0); void _wbTotal;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-0 border-b" style={{ background: TEAL }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: BLUE }}>CG</div>
            <span className="font-bold text-white">Coglass</span>
          </div>
          <div className="flex items-center gap-2">
            {apiError && <span className="text-xs text-red-300">{apiError}</span>}
            {wbRows.length > 0 && jobUuid && (
              <button onClick={manualSave} className="text-xs text-white/70 hover:text-white">
                {saved ? "✓ Saved" : "Save"}
              </button>
            )}
            {!jobUuid && !loading && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "rgba(255,200,0,0.2)", color: "#fde68a" }}>No job</span>
            )}
            {sessionToken && (
              <button
                onClick={() => { window.location.href = "/setup"; }}
                title="Settings"
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {([
            ["workbench", "Workbench"],
            ["products", "Products"],
            ["operations", "Operations"],
            ["cutsheet", "Cut Sheet"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors relative"
              style={tab === id ? { background: "#f9fafb", color: TEAL } : { background: "transparent", color: "rgba(255,255,255,0.65)" }}>
              {label}
              {id === "workbench" && wbRows.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: BLUE, fontSize: "10px" }}>{wbRows.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Workbench tab */}
      {tab === "workbench" && (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
          ) : wbRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center">
              <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: `${BLUE}18` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </div>
              <div className="font-semibold text-gray-700 mb-1 text-base">Workbench is empty</div>
              <div className="text-sm text-gray-400 mb-6 max-w-xs">Add glass products and operations to build your quote</div>
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                <button onClick={() => setPanel({ type: "product-search" })} className="w-full text-white font-bold py-3 rounded-xl text-sm" style={{ background: BLUE }}>+ Add Glass Product</button>
                <button onClick={() => setPanel({ type: "georgian" })} className="w-full font-bold py-3 rounded-xl text-sm border-2" style={{ borderColor: BLUE, color: BLUE, background: "white" }}>⊞ Georgian Bars</button>
                <button onClick={() => setPanel({ type: "op-search" })} className="w-full font-semibold py-3 rounded-xl text-sm border text-gray-600 bg-white">+ Add Operation</button>
                <button onClick={() => setShowCustom(true)} className="w-full font-semibold py-3 rounded-xl text-sm border text-gray-500 bg-white">+ Custom Row</button>
              </div>
            </div>
          ) : (
            <div className="p-3">
              <WorkbenchRows
                rows={wbRows}
                onQty={(id, qty) => mutateRows(r => r.map(row => row.id === id ? { ...row, qty } : row))}
                onDelete={(id) => mutateRows(r => r.filter(row => row.id !== id))}
                onMoveUp={(id) => moveRow(id, -1)}
                onMoveDown={(id) => moveRow(id, 1)}
                onNoteChange={(id, note) => mutateRows(r => r.map(row => row.id === id ? { ...row, notes: note } : row))}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setPanel({ type: "product-search" })} className="text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: BLUE }}>+ Product</button>
                <button onClick={() => setPanel({ type: "georgian" })} className="text-xs font-bold px-3 py-2 rounded-lg border-2" style={{ borderColor: BLUE, color: BLUE }}>⊞ Georgian</button>
                <button onClick={() => setPanel({ type: "op-search" })} className="text-xs font-semibold px-3 py-2 rounded-lg border text-gray-600">+ Operation</button>
                <button onClick={() => setShowCustom(true)} className="text-xs font-semibold px-3 py-2 rounded-lg border text-gray-500">+ Custom</button>
                <button onClick={() => setTab("cutsheet")} className="text-xs font-semibold px-3 py-2 rounded-lg border text-gray-500 ml-auto">Cut Sheet →</button>
              </div>
              <TotalsSection rows={wbRows} vatRate={vatRate} />
              <div className="mt-3 mb-2">
                {jobUuid ? (
                  <button onClick={() => void pushToJob()} disabled={pushing}
                    className="w-full text-white font-bold py-4 rounded-xl text-sm disabled:opacity-50"
                    style={{ background: GREEN }}>
                    {pushing ? "Pushing to ServiceM8…" : `Push ${wbRows.length} item${wbRows.length !== 1 ? "s" : ""} to Job`}
                  </button>
                ) : (
                  <div className="text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Open from a ServiceM8 job to push items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products tab */}
      {tab === "products" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
            : <ItemList items={products} placeholder="Search glass, units…"
              onSelect={p => setPanel({ type: "product-calc", product: p })}
              unitLabel={p => p.unit === "m2" ? "/m²" : `/${p.unit}`} />}
        </div>
      )}

      {/* Operations tab */}
      {tab === "operations" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
            : <ItemList items={operations} placeholder="Search edges, polishing…"
              onSelect={o => setPanel({ type: "op-calc", op: o })}
              unitLabel={o => o.unit === "linear_m" ? "/lin.m" : `/${o.unit}`} />}
        </div>
      )}

      {/* Cut Sheet tab */}
      {tab === "cutsheet" && (
        <CutSheetTab rows={wbRows} jobUuid={jobUuid} account={account} />
      )}

      {/* Custom row modal */}
      {showCustom && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={e => { if (e.target === e.currentTarget) setShowCustom(false); }}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div className="font-bold text-base" style={{ color: TEAL }}>Add Custom Row</div>
              <button onClick={() => setShowCustom(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Delivery charge"
                className="w-full border rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Unit price (£)</label>
                <input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Quantity</label>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => setCustomQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border font-bold text-gray-600">−</button>
                  <span className="font-bold text-center w-6">{customQty}</span>
                  <button onClick={() => setCustomQty(q => q + 1)} className="w-9 h-9 rounded-full border font-bold text-gray-600">+</button>
                </div>
              </div>
            </div>
            <button disabled={!customName.trim() || !Number(customPrice)}
              onClick={() => {
                addRow({ id: uid(), rowType: "custom", name: customName.trim(), description: "", qty: customQty, unit: "item", unit_price: Number(customPrice) });
                setCustomName(""); setCustomPrice(""); setCustomQty(1); setShowCustom(false);
              }}
              className="w-full text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
              style={{ background: BLUE }}>
              Add to Workbench
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
