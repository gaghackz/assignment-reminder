import { NextRequest, NextResponse } from "next/server";

import { markCompleted } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET_CODE || secret !== process.env.ADMIN_SECRET_CODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await markCompleted(id);
  return NextResponse.json({ success: true });
}
