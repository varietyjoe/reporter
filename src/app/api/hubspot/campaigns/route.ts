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
    // Support multiple owner IDs (comma-separated)
    const ownerIdsParam = searchParams.get("ownerIds");
    const ownerIds = ownerIdsParam ? ownerIdsParam.split(",").filter(Boolean) : [];
    const activeOnly = searchParams.get("activeOnly") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get campaign data (sequences + enrollments + deals)
    const campaignData = await client.getCampaignData({
      ownerIds: ownerIds.length > 0 ? ownerIds : undefined,
      activeOnly,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json(campaignData);
  } catch (error) {
    console.error("Error fetching campaign data:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign data" },
      { status: 500 }
    );
  }
}
