import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { STATUS_LABELS, formatCents, type ClientServiceStatus } from "@/lib/catalog";

// Export de l'ensemble des activations, une ligne par solution activée.
//
// Volontairement non paginé, à la différence de l'écran : un export sert
// justement à sortir de l'outil — comptabilité, réconciliation, demande
// d'accès aux données. Le limiter à la page affichée le rendrait inutile.
export async function GET() {
  // Une route d'export lit les données de tous les clients : la vérification
  // se refait ici, elle n'est pas héritée du layout.
  await requireAdmin();

  const rows = await db.clientService.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      service: true,
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Client", value: (r) => r.user.name },
    { header: "E-mail", value: (r) => r.user.email },
    { header: "Organisation", value: (r) => r.organization.name },
    { header: "Solution", value: (r) => r.service.name },
    { header: "Nom de l'activation", value: (r) => r.name },
    {
      header: "Statut",
      value: (r) => STATUS_LABELS[r.status as ClientServiceStatus] ?? r.status,
    },
    {
      header: "Frais de mise en place",
      value: (r) =>
        r.service.setupFeeCents === null ? "" : formatCents(r.service.setupFeeCents),
    },
    {
      header: "Abonnement mensuel",
      value: (r) =>
        r.service.monthlyPriceCents === null
          ? ""
          : formatCents(r.service.monthlyPriceCents),
    },
    { header: "Code promo", value: (r) => r.promoCode },
    { header: "Numéro attribué", value: (r) => r.externalPhoneNumber },
    { header: "Note pour le client", value: (r) => r.adminNote },
    { header: "Demandée le", value: (r) => r.createdAt },
    { header: "Activée le", value: (r) => r.activatedAt },
    { header: "Résiliée le", value: (r) => r.canceledAt },
  ]);

  return new Response(csv, { headers: csvResponseHeaders("clients-noveris") });
}
