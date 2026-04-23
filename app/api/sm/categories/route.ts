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
    "SELECT * FROM sm_categories WHERE tenant_id = $1 ORDER BY sort_order, name",
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
    `INSERT INTO sm_categories (tenant_id, name, sort_order) VALUES ($1,$2,$3) RETURNING *`,
    [session.tenantId, body.name, Number(body.sortOrder ?? 0)]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
