"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// Appelée à l'ouverture du panneau de notifications : tout ce qui précède
// cet instant devient lu (voir src/lib/notifications.ts pour le choix d'un
// horodatage unique plutôt que d'un état par notification). Vit à la racine
// de src/app : la cloche est dans l'en-tête partagé par le tableau de bord
// client et l'espace admin.
export async function markNotificationsSeen() {
  const session = await getSession();
  if (!session) return;

  await db.user.update({
    where: { id: session.user.id },
    data: { notificationsSeenAt: new Date() },
  });

  // L'en-tête est rendu par les layouts des deux espaces : c'est leur
  // arborescence entière qu'il faut réévaluer pour que le compteur retombe.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}
