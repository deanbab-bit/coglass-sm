import { NextResponse } from "next/server";
import { exchangeCode, getCompanyInfo, signSessionToken } from "@/lib/servicem8";
import { ensureSchema, upsertTenant, seedTenantDefaults } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/addon?error=auth_failed", req.url));
  }

  try {
    await ensureSchema();

    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Get company info (account UUID + name)
    const company = await getCompanyInfo(tokens.access_token);

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

    const redirectUrl = new URL("/addon", req.url);
    redirectUrl.searchParams.set("session", sessionToken);

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/addon?error=server_error", req.url));
  }
}
