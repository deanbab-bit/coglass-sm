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
    "SELECT company_name, supplier_name, supplier_email, supplier_phone, vat_rate FROM sm_tenants WHERE id=$1",
    [session.tenantId]
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...rows[0],
    vat_rate: rows[0].vat_rate != null ? Number(rows[0].vat_rate) : 0.20,
  });
}

export async function PUT(req: Request) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const db = getPool();
  const body = await req.json().catch(() => ({}));
  const { rows } = await db.query(
    `UPDATE sm_tenants SET
       supplier_name = COALESCE($1, supplier_name),
       supplier_email = COALESCE($2, supplier_email),
       supplier_phone = COALESCE($3, supplier_phone),
       vat_rate = COALESCE($4, vat_rate)
     WHERE id = $5 RETURNING company_name, supplier_name, supplier_email, supplier_phone, vat_rate`,
    [
      body.supplierName ?? null,
      body.supplierEmail ?? null,
      body.supplierPhone ?? null,
      body.vatRate != null ? Number(body.vatRate) : null,
      session.tenantId,
    ]
  );
  return NextResponse.json(rows[0] ?? {});
}
