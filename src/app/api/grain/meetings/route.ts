import { NextRequest, NextResponse } from "next/server";
import { GrainClient } from "@/lib/grain/client";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GRAIN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Grain not connected. Add GRAIN_API_KEY to .env.local" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const client = new GrainClient(apiKey);
    const meetings = await client.listMeetings({
      startDate,
      endDate,
    });

    return NextResponse.json({ results: meetings, total: meetings.length });
  } catch (error) {
    console.error("Failed to fetch Grain meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Grain meetings", details: String(error) },
      { status: 500 }
    );
  }
}
