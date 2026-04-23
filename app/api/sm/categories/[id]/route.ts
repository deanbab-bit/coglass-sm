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
    `UPDATE sm_categories SET name=$1, sort_order=$2
     WHERE id=$3 AND tenant_id=$4 RETURNING *`,
    [body.name, Number(body.sortOrder ?? 0), id, session.tenantId]
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
    "DELETE FROM sm_categories WHERE id=$1 AND tenant_id=$2",
    [id, session.tenantId]
  );
  return NextResponse.json({ ok: true });
}
