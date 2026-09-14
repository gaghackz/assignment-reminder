import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEvents } from "@/lib/store";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const events = await getEvents();
  return NextResponse.json({ events });
}
