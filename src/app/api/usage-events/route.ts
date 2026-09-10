import { NextResponse } from "next/server";
import { recordUsageEvent } from "@/lib/usage-events";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const allowed = await checkRateLimit("usage-events", await getClientIp(), "1 m", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.USAGE_EVENTS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clientServiceId =
    body && typeof body.clientServiceId === "string"
      ? body.clientServiceId
      : null;
  if (!clientServiceId) {
    return NextResponse.json(
      { error: "clientServiceId is required" },
      { status: 400 }
    );
  }

  const occurredAt =
    body && typeof body.occurredAt === "string"
      ? new Date(body.occurredAt)
      : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Invalid occurredAt" }, { status: 400 });
  }

  const externalId =
    body && typeof body.externalId === "string" ? body.externalId : null;
  const status: "in_progress" | "completed" =
    body?.status === "in_progress" ? "in_progress" : "completed";
  const durationSec =
    body && typeof body.durationSec === "number" ? body.durationSec : null;
  const metadata =
    body && typeof body.metadata === "object" && body.metadata !== null
      ? body.metadata
      : undefined;

  try {
    const { count } = await recordUsageEvent({
      clientServiceId,
      externalId,
      status,
      occurredAt,
      durationSec,
      metadata,
    });
    return NextResponse.json({ count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unknown clientServiceId" }, { status: 404 });
  }
}
