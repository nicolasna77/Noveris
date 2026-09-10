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

export async function getMyInvoices(
  userId: string,
  organizationId: string
): Promise<InvoiceDTO[]> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user.stripeCustomerId) return [];

  const [stripeInvoices, clientServices] = await Promise.all([
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
      const ref = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof ref === "string" ? ref : ref?.id;
      const serviceName = subscriptionId
        ? (serviceNameBySubscriptionId.get(subscriptionId) ?? null)
        : null;
      return { invoice, serviceName, subscriptionId };
    })
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
