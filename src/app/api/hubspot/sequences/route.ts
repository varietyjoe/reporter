import { NextRequest, NextResponse } from "next/server";
import { getHubSpotClient } from "@/lib/hubspot/client";

export async function GET(request: NextRequest) {
  const client = getHubSpotClient();

  if (!client) {
    return NextResponse.json(
      { error: "HubSpot not configured" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Get sequences - requires userId
    const sequences = await client.getSequences(userId || undefined);

    return NextResponse.json(sequences);
  } catch (error) {
    console.error("Error fetching sequences:", error);
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    );
  }
}
