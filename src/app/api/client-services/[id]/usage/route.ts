import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const clientService = await db.clientService.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!clientService || clientService.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await db.usageEvent.count({
    where: {
      clientServiceId: id,
      type: "call",
      status: "completed",
      occurredAt: { gte: periodStart },
    },
  });

  return NextResponse.json({ count, periodStart: periodStart.toISOString() });
}
