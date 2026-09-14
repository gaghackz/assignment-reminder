import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { markCompleted } from "@/lib/store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  await markCompleted(id);
  return NextResponse.json({ success: true });
}
