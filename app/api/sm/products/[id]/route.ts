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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await ensureSchema();
  const db = getPool();
  const body = await req.json().catch(() => ({}));

  const { rows } = await db.query(
    `UPDATE sm_products SET
       category_id=$1, name=$2, description=$3, thickness=$4, unit=$5,
       sell_price=$6, cost_price=$7, min_width_mm=$8, max_width_mm=$9,
       min_height_mm=$10, max_height_mm=$11, active=$12, sort_order=$13
     WHERE id=$14 AND tenant_id=$15 RETURNING *`,
    [
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
      id,
      session.tenantId,
    ]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await ensureSchema();
  const db = getPool();

  await db.query(
    "DELETE FROM sm_products WHERE id=$1 AND tenant_id=$2",
    [id, session.tenantId]
  );
  return NextResponse.json({ ok: true });
}
