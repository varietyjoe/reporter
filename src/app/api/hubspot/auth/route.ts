import { NextResponse } from "next/server";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_SCOPES = [
  "crm.objects.deals.read",
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "sales-email-read",
  "crm.objects.owners.read",
].join(" ");

export async function GET() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/hubspot/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "HubSpot client ID not configured" },
      { status: 500 }
    );
  }

  const authUrl = new URL(HUBSPOT_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", HUBSPOT_SCOPES);

  return NextResponse.redirect(authUrl.toString());
}
