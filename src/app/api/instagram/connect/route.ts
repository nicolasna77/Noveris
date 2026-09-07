import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildInstagramAuthUrl } from "@/lib/instagram";

// Démarre la connexion Instagram d'une prestation — redirige vers l'écran
// de consentement Instagram, le callback fait le reste. Même structure que
// src/app/api/google-calendar/connect/route.ts.
export async function GET(request: Request) {
  const session = await requireUser();

  const clientServiceId = new URL(request.url).searchParams.get("clientServiceId");
  if (!clientServiceId) {
    return NextResponse.json({ error: "clientServiceId requis" }, { status: 400 });
  }

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    select: { userId: true },
  });
  if (!clientService || clientService.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(buildInstagramAuthUrl(clientServiceId));
}
