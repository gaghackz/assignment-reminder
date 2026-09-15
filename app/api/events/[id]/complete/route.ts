import { NextRequest, NextResponse } from "next/server";

import { markCompleted } from "@/lib/store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await markCompleted(id);
  return NextResponse.json({ success: true });
}
