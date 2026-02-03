import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_TARGETS = {
  meetingsTarget: 5,
  qualOppsTarget: 3,
  conversionsTarget: 2,
  mrrPerConversion: 300,
};

export async function GET() {
  try {
    const target = await prisma.magicFormulaTarget.findFirst({
      where: { scope: "global" },
    });

    if (!target) {
      return NextResponse.json({ target: { scope: "global", ...DEFAULT_TARGETS } });
    }

    return NextResponse.json({ target });
  } catch (error) {
    console.error("Failed to fetch Magic Formula targets:", error);
    return NextResponse.json(
      { error: "Failed to fetch Magic Formula targets", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const meetingsTarget = Number(body?.meetingsTarget ?? DEFAULT_TARGETS.meetingsTarget);
    const qualOppsTarget = Number(body?.qualOppsTarget ?? DEFAULT_TARGETS.qualOppsTarget);
    const conversionsTarget = Number(body?.conversionsTarget ?? DEFAULT_TARGETS.conversionsTarget);
    const mrrPerConversion = Number(body?.mrrPerConversion ?? DEFAULT_TARGETS.mrrPerConversion);

    if (
      !Number.isFinite(meetingsTarget) ||
      !Number.isFinite(qualOppsTarget) ||
      !Number.isFinite(conversionsTarget) ||
      !Number.isFinite(mrrPerConversion)
    ) {
      return NextResponse.json({ error: "All target fields must be numbers" }, { status: 400 });
    }

    const existingTarget = await prisma.magicFormulaTarget.findFirst({
      where: { scope: "global", teamId: null, ownerId: null },
    });

    const target = existingTarget
      ? await prisma.magicFormulaTarget.update({
          where: { id: existingTarget.id },
          data: {
            meetingsTarget,
            qualOppsTarget,
            conversionsTarget,
            mrrPerConversion,
          },
        })
      : await prisma.magicFormulaTarget.create({
          data: {
            scope: "global",
            meetingsTarget,
            qualOppsTarget,
            conversionsTarget,
            mrrPerConversion,
          },
        });

    return NextResponse.json({ target });
  } catch (error) {
    console.error("Failed to save Magic Formula targets:", error);
    return NextResponse.json(
      { error: "Failed to save Magic Formula targets", details: String(error) },
      { status: 500 }
    );
  }
}
