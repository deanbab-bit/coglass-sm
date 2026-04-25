import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/servicem8";
import { ensureSchema, getPool } from "@/lib/db";

export const runtime = "nodejs";

function getSession(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  try { return verifySessionToken(token); } catch { return null; }
}

export async function GET(req: Request) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSchema();
  const db = getPool();
  const { rows } = await db.query(
    `SELECT p.*, c.name AS category_name
     FROM sm_products p
     LEFT JOIN sm_categories c ON c.id = p.category_id
     WHERE p.tenant_id = $1
     ORDER BY c.sort_order, p.sort_order, p.name`,
    [session.tenantId]
  );
  const parsed = rows.map((r) => ({ ...r, sell_price: Number(r.sell_price), cost_price: Number(r.cost_price) }));
  return NextResponse.json(parsed);
}

export async function POST(req: Request) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSchema();
  const db = getPool();
  const body = await req.json().catch(() => ({}));

  const { rows } = await db.query(
    `INSERT INTO sm_products
     (tenant_id, category_id, name, description, thickness, unit, sell_price, cost_price, min_width_mm, max_width_mm, min_height_mm, max_height_mm, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      session.tenantId,
      body.categoryId ?? null,
      body.name,
      body.description ?? null,
      body.thickness ?? null,
      body.unit ?? "m2",
      Number(body.sellPrice ?? 0),
      Number(body.costPrice ?? 0),
      body.minWidthMm ?? null,
      body.maxWidthMm ?? null,
      body.minHeightMm ?? null,
      body.maxHeightMm ?? null,
      body.active !== false,
      Number(body.sortOrder ?? 0),
    ]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
