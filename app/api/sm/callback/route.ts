import { NextResponse } from "next/server";
import * as crypto from "crypto";

export const runtime = "nodejs";

// ServiceM8 posts a JWT to this URL when add-on events occur.
// We validate it using HMAC-SHA-256 with the App Secret, then process.
export async function POST(req: Request) {
  const APP_SECRET = process.env.SM_APP_SECRET ?? "";
  const body = await req.text();

  // The body is a JWT — validate the signature
  const parts = body.trim().split(".");
  if (parts.length !== 3) {
    return NextResponse.json({ error: "Invalid JWT" }, { status: 400 });
  }

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", APP_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (expectedSig !== signature) {
    console.warn("ServiceM8 callback: invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Decode payload
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  console.log("ServiceM8 callback event:", JSON.stringify(data, null, 2));

  // Acknowledge receipt — ServiceM8 expects a 200
  return NextResponse.json({ ok: true });
}
