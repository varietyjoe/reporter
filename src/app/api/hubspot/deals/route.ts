import { NextRequest, NextResponse } from "next/server";
import { getHubSpotClient } from "@/lib/hubspot/client";

export async function GET(request: NextRequest) {
  try {
    const client = getHubSpotClient();

    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipeline");
    const all = searchParams.get("all") === "true";
    const ownerIds = searchParams.get("ownerIds")?.split(",").filter(Boolean) || [];
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    let deals;

    if (pipelineId) {
      // Fetch deals for specific pipeline with optional filters
      deals = await client.getDealsByPipeline(pipelineId, { ownerIds, startDate, endDate });
      return NextResponse.json({ results: deals });
    } else if (all) {
      // Fetch ALL deals (paginated) with optional filters
      deals = await client.getAllDeals({ ownerIds, startDate, endDate });
      return NextResponse.json({ results: deals });
    } else {
      // Default: fetch first 100 deals
      const response = await client.getDeals(100);
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error("Failed to fetch deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals", details: String(error) },
      { status: 500 }
    );
  }
}
