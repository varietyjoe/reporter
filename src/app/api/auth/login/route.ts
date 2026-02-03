import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "app_session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body?.password || "");
    const expected = process.env.APP_AUTH_PASSWORD || "";

    if (!expected || password !== expected) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to login", details: String(error) },
      { status: 500 }
    );
  }
}
