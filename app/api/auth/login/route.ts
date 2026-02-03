import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const validPassword = process.env.APP_PASSWORD;
  if (!validPassword) {
    return NextResponse.json({ error: "Password not configured" }, { status: 500 });
  }

  if (password === validPassword) {
    // Set a session cookie
    const cookieStore = await cookies();
    cookieStore.set("townbench_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
