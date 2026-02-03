import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=no_code`
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(HUBSPOT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/hubspot/callback`,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("HubSpot token exchange failed:", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?error=token_exchange`
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info to get portal ID
    const userResponse = await fetch(
      "https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token
    );
    const userInfo = await userResponse.json();

    // For now, we'll use a placeholder user ID
    // In production, you'd get this from the session
    const userId = "demo-user";

    // Store tokens in database
    await prisma.hubSpotToken.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        portalId: userInfo.hub_id?.toString(),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        portalId: userInfo.hub_id?.toString(),
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?success=hubspot_connected`
    );
  } catch (error) {
    console.error("HubSpot OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=oauth_error`
    );
  }
}
