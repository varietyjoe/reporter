import { NextRequest, NextResponse } from "next/server";
import { generatePipelineInsights, generateMeetingInsights } from "@/lib/ai/insights";
import type { DailyMetrics } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, metrics, historicalMetrics, transcript, summary } = body;

    if (type === "pipeline") {
      if (!metrics) {
        return NextResponse.json(
          { error: "Metrics required for pipeline insights" },
          { status: 400 }
        );
      }

      const insights = await generatePipelineInsights(
        metrics as DailyMetrics,
        (historicalMetrics || []) as DailyMetrics[]
      );

      return NextResponse.json({ insights });
    }

    if (type === "meeting") {
      if (!transcript || !summary) {
        return NextResponse.json(
          { error: "Transcript and summary required for meeting insights" },
          { status: 400 }
        );
      }

      const insights = await generateMeetingInsights(transcript, summary);

      return NextResponse.json({ insights });
    }

    return NextResponse.json(
      { error: "Invalid insight type. Use 'pipeline' or 'meeting'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
