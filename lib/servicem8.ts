// ServiceM8 OAuth + API helpers

const SM_API = "https://api.servicem8.com/api_1.0";
const SM_TOKEN_URL = "https://go.servicem8.com/oauth/access_token";
const SM_AUTH_URL = "https://go.servicem8.com/oauth/authorize";

export function getSmClientId() {
  return process.env.SM_CLIENT_ID ?? "";
}

export function getSmClientSecret() {
  return process.env.SM_CLIENT_SECRET ?? "";
}

export function getRedirectUri() {
  return process.env.SM_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`;
}

// Build the OAuth authorisation URL (not needed if SM initiates — but useful for dev)
export function buildAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getSmClientId(),
    redirect_uri: getRedirectUri(),
    scope: "manage_job_materials read_company_config",
    ...(state ? { state } : {}),
  });
  return `${SM_AUTH_URL}?${params}`;
}

// Exchange auth code for access token
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  account_uuid?: string;
}> {
  const res = await fetch(SM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getSmClientId(),
      client_secret: getSmClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SM token exchange failed: ${txt}`);
  }
  return res.json();
}

// Refresh an expired token
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const res = await fetch(SM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getSmClientId(),
      client_secret: getSmClientSecret(),
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error("SM token refresh failed");
  return res.json();
}

// Get the authenticated company info (gives us account UUID + name)
export async function getCompanyInfo(accessToken: string): Promise<{
  uuid: string;
  name: string;
}> {
  const res = await fetch(`${SM_API}/companyconfig.json`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch SM company info");
  const data = await res.json();
  return { uuid: data.uuid, name: data.name };
}

// Add line items to a ServiceM8 job
export async function pushJobMaterials(
  accessToken: string,
  jobUuid: string,
  items: {
    name: string;
    description?: string;
    unit_price: number;
    quantity: number;
  }[]
): Promise<void> {
  for (const item of items) {
    await fetch(`${SM_API}/jobmaterial.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_uuid: jobUuid,
        name: item.name,
        description: item.description ?? "",
        unit_price: item.unit_price,
        quantity: item.quantity,
        active: 1,
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// Session token — we sign a short-lived JWT so the iframe can identify the
// tenant without exposing the SM access token to the browser.
// ---------------------------------------------------------------------------
import jwt from "jsonwebtoken";

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "dev-secret-change-me";
}

export function signSessionToken(tenantId: number, smAccountUuid: string): string {
  return jwt.sign({ tenantId, smAccountUuid }, getJwtSecret(), { expiresIn: "8h" });
}

export function verifySessionToken(token: string): { tenantId: number; smAccountUuid: string } {
  return jwt.verify(token, getJwtSecret()) as { tenantId: number; smAccountUuid: string };
}
