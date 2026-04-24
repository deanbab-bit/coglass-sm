import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/servicem8";

export const runtime = "nodejs";

// ServiceM8 redirects here when a user installs/activates the add-on.
// We kick off the OAuth flow so they grant us API access.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? undefined;
  const authUrl = buildAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
