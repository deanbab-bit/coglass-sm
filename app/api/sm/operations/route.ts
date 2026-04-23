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
    `SELECT o.*, c.name AS category_name
     FROM sm_operations o
     LEFT JOIN sm_categories c ON c.id = o.category_id
     WHERE o.tenant_id = $1
     ORDER BY c.sort_order, o.sort_order, o.name`,
    [session.tenantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSchema();
  const db = getPool();
  const body = await req.json().catch(() => ({}));

  const { rows } = await db.query(
    `INSERT INTO sm_operations
     (tenant_id, category_id, name, description, unit, sell_price, cost_price, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      session.tenantId,
      body.categoryId ?? null,
      body.name,
      body.description ?? null,
      body.unit ?? "item",
      Number(body.sellPrice ?? 0),
      Number(body.costPrice ?? 0),
      body.active !== false,
      Number(body.sortOrder ?? 0),
    ]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
