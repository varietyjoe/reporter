import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const seats = await prisma.seat.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ results: seats });
  } catch (error) {
    console.error("Failed to fetch seats:", error);
    return NextResponse.json(
      { error: "Failed to fetch seats", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const seat = await prisma.seat.create({
      data: {
        name,
        email: body?.email ? String(body.email).trim() : undefined,
        role: body?.role || "rep",
        status: body?.status || "active",
        hubspotOwnerId: body?.hubspotOwnerId ? String(body.hubspotOwnerId).trim() : undefined,
        userId: body?.userId ? String(body.userId).trim() : undefined,
      },
    });

    return NextResponse.json({ result: seat });
  } catch (error) {
    console.error("Failed to create seat:", error);
    return NextResponse.json(
      { error: "Failed to create seat", details: String(error) },
      { status: 500 }
    );
  }
}
