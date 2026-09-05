import { getMyInvoices } from "./get-invoices";
import { SpendChartView } from "./spend-chart-view";

const MONTHS_SHOWN = 6;

// Regroupe les factures payées par mois calendaire (6 derniers mois, mois en
// cours inclus) — toujours 6 buckets, même à zéro, pour ne pas cacher le
// graphique chez un client qui vient de s'inscrire.
export async function SpendChart({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const invoices = await getMyInvoices(userId, organizationId);
  const now = new Date();

  const buckets = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - i), 1);
    return {
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(monthStart),
      totalCents: 0,
    };
  });
  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

  for (const invoice of invoices) {
    if (invoice.status !== "paid") continue;
    const key = `${invoice.createdAt.getFullYear()}-${invoice.createdAt.getMonth()}`;
    const bucket = bucketByKey.get(key);
    if (bucket) bucket.totalCents += invoice.amountPaidCents;
  }

  const totalCents = buckets.reduce((sum, b) => sum + b.totalCents, 0);

  return <SpendChartView data={buckets} totalCents={totalCents} />;
}
