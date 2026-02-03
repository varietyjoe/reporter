import { NextRequest, NextResponse } from "next/server";
import { getHubSpotClient } from "@/lib/hubspot/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getHubSpotClient();
    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const properties = body?.properties as Record<string, string | null | undefined> | undefined;

    if (!properties || Object.keys(properties).length === 0) {
      return NextResponse.json({ error: "No properties to update" }, { status: 400 });
    }

    const result = await client.updateDeal(id, properties);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to update deal:", error);
    return NextResponse.json(
      { error: "Failed to update deal", details: String(error) },
      { status: 500 }
    );
  }
}
