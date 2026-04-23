import { NextResponse } from "next/server";
import { verifySessionToken, pushJobMaterials } from "@/lib/servicem8";
import { ensureSchema, getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let session: { tenantId: number; smAccountUuid: string };
  try { session = verifySessionToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const { jobUuid, items } = body as {
    jobUuid: string;
    items: { name: string; description?: string; unitPrice: number; quantity: number }[];
  };

  if (!jobUuid || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "jobUuid and items required" }, { status: 400 });
  }

  await ensureSchema();
  const db = getPool();
  const { rows } = await db.query(
    "SELECT access_token FROM sm_tenants WHERE id = $1",
    [session.tenantId]
  );
  if (!rows[0]) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  await pushJobMaterials(
    rows[0].access_token,
    jobUuid,
    items.map((i) => ({ name: i.name, description: i.description, unit_price: i.unitPrice, quantity: i.quantity }))
  );

  return NextResponse.json({ ok: true, pushed: items.length });
}
