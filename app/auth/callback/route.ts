import { NextResponse } from "next/server";
import { exchangeCode, getCompanyInfo, signSessionToken } from "@/lib/servicem8";
import { ensureSchema, upsertTenant, seedTenantDefaults } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log("OAuth callback — params:", Object.fromEntries(url.searchParams));

  if (error || !code) {
    console.error("OAuth callback failed — error:", error, "code present:", !!code);
    return NextResponse.redirect(`${base}/addon?error=auth_failed&detail=${encodeURIComponent(error ?? "no_code")}`);
  }

  try {
    await ensureSchema();

    // Exchange code for tokens
    const tokens = await exchangeCode(code);
    console.log("OAuth tokens received — account_uuid:", tokens.account_uuid);

    // Get company info (account UUID + name)
    // Fall back to token's account_uuid if companyconfig call fails
    let company: { uuid: string; name: string };
    try {
      company = await getCompanyInfo(tokens.access_token);
    } catch (e) {
      console.warn("getCompanyInfo failed, falling back to token data:", e);
      company = {
        uuid: tokens.account_uuid ?? "unknown",
        name: "Unknown",
      };
    }

    // Upsert tenant
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const tenant = await upsertTenant({
      smAccountUuid: company.uuid,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      companyName: company.name,
    });

    // Seed default products + operations for new tenants
    await seedTenantDefaults(tenant.id);

    // Sign a session token and redirect to the add-on UI
    const sessionToken = signSessionToken(tenant.id, company.uuid);

    return NextResponse.redirect(`${base}/addon?session=${sessionToken}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${base}/addon?error=server_error`);
  }
}
