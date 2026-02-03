import { NextRequest, NextResponse } from "next/server";
import { GrainClient } from "@/lib/grain/client";
import { extractGrainShareUrl } from "@/lib/grain/share";

interface GrainMeetingDetails {
  id: string;
  title: string;
  duration: string;
  summary: string | null;
  startDatetime: string;
  coachingScore: number | null;
  shareUrl: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GRAIN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Grain not connected. Add GRAIN_API_KEY to .env.local" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];

    if (ids.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const client = new GrainClient(apiKey);
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const [meeting, coaching] = await Promise.all([
            client.getMeeting(id),
            client.getCoachingFeedback(id),
          ]);
          const detail: GrainMeetingDetails = {
            id,
            title: meeting.title,
            duration: meeting.duration,
            summary: meeting.summary,
            startDatetime: meeting.startDatetime,
            coachingScore: coaching?.overallScore ?? null,
            shareUrl: extractGrainShareUrl(meeting),
          };
          return detail;
        } catch (error) {
          console.warn("Failed to fetch Grain meeting details:", id, error);
          return null;
        }
      })
    );

    return NextResponse.json({
      results: results.filter(Boolean),
    });
  } catch (error) {
    console.error("Failed to fetch Grain meeting details:", error);
    return NextResponse.json(
      { error: "Failed to fetch Grain meeting details", details: String(error) },
      { status: 500 }
    );
  }
}
