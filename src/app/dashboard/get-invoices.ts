import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/auth";

export type InvoiceDTO = {
  id: string;
  number: string | null;
  status: Stripe.Invoice.Status | null;
  createdAt: Date;
  amountPaidCents: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  serviceName: string | null;
};

// Toutes les prestations du catalogue ont un `monthlyPriceCents` non nul
// (voir src/lib/catalog-data.ts) : chaque activation crée une Checkout
// Session en `mode: "subscription"` (src/app/dashboard/actions.ts), donc
// Stripe génère déjà de vraies factures pour chaque prestation — pas besoin
// d'un modèle Invoice local, on les relit directement depuis Stripe.
//
// Le client Stripe est partagé par toutes les organisations d'un même
// utilisateur (un seul stripeCustomerId sur User) — on ne peut donc pas
// filtrer côté Stripe par organisation. On liste les factures du client puis
// on ne garde que celles dont l'abonnement correspond à une prestation de
// l'organisation demandée (les autres appartiennent à ses autres
// organisations).
export async function getMyInvoices(
  userId: string,
  organizationId: string
): Promise<InvoiceDTO[]> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  // Ne jamais appeler invoices.list sans filtre `customer` — ce serait lister
  // les factures de tous les clients Stripe, pas seulement les siennes.
  if (!user.stripeCustomerId) return [];

  const [stripeInvoices, clientServices] = await Promise.all([
    // MVP : une seule page (max 100, le plus récent d'abord). À paginer
    // (autoPagingEach) si un client dépasse un jour 100 factures.
    stripeClient.invoices.list({ customer: user.stripeCustomerId, limit: 100 }),
    db.clientService.findMany({
      where: { organizationId, stripeSubscriptionId: { not: null } },
      select: {
        stripeSubscriptionId: true,
        name: true,
      },
    }),
  ]);

  const serviceNameBySubscriptionId = new Map(
    clientServices.map((cs) => [cs.stripeSubscriptionId as string, cs.name])
  );

  return stripeInvoices.data
    .map((invoice) => {
      // Sur l'API pinnée ici (2026-06-24.dahlia), l'abonnement d'une facture
      // ne se lit plus sur `invoice.subscription` (n'existe plus à ce
      // niveau) mais sous `parent.subscription_details.subscription`.
      const ref = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof ref === "string" ? ref : ref?.id;
      const serviceName = subscriptionId
        ? (serviceNameBySubscriptionId.get(subscriptionId) ?? null)
        : null;
      return { invoice, serviceName, subscriptionId };
    })
    // Une facture sans correspondance appartient à une autre organisation du
    // même client Stripe — on ne la remonte pas ici.
    .filter(({ subscriptionId }) => subscriptionId && serviceNameBySubscriptionId.has(subscriptionId))
    .map(({ invoice, serviceName }) => ({
      id: invoice.id!,
      number: invoice.number,
      status: invoice.status,
      createdAt: new Date(invoice.created * 1000),
      amountPaidCents: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      serviceName,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
