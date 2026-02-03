import { NextResponse } from "next/server";
import { getHubSpotClient } from "@/lib/hubspot/client";

export async function GET() {
  try {
    const client = getHubSpotClient();

    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected" },
        { status: 401 }
      );
    }

    const pipelines = await client.getPipelines();

    return NextResponse.json(pipelines);
  } catch (error) {
    console.error("Failed to fetch pipelines:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipelines", details: String(error) },
      { status: 500 }
    );
  }
}
