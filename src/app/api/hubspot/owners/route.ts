import { NextResponse } from "next/server";
import { getHubSpotClient } from "@/lib/hubspot/client";

export async function GET() {
  try {
    const client = getHubSpotClient();
    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const owners = await client.getOwners();
    return NextResponse.json({ results: owners.results });
  } catch (error) {
    console.error("Failed to fetch owners:", error);
    return NextResponse.json(
      { error: "Failed to fetch owners", details: String(error) },
      { status: 500 }
    );
  }
}
