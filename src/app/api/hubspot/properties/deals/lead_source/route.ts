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

    const options = await client.getDealPropertyOptions("lead_source");
    return NextResponse.json({ options });
  } catch (error) {
    console.error("Failed to fetch deal lead source options:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead source options", details: String(error) },
      { status: 500 }
    );
  }
}
