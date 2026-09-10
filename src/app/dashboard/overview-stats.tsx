import { PhoneCall, Wallet, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/catalog";

export async function OverviewStats({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeServices, callsThisMonth] = await Promise.all([
    db.clientService.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { service: { select: { monthlyPriceCents: true } } },
    }),
    db.usageEvent.count({
      where: {
        clientService: { organizationId },
        type: "call",
        status: "completed",
        occurredAt: { gte: periodStart },
      },
    }),
  ]);

  const monthlySpendCents = activeServices.reduce(
    (sum, cs) => sum + (cs.service.monthlyPriceCents ?? 0),
    0
  );

  const stats = [
    { icon: Zap, label: "Solutions actives", value: String(activeServices.length) },
    { icon: Wallet, label: "Dépense mensuelle", value: formatPrice(null, monthlySpendCents) },
    { icon: PhoneCall, label: "Appels ce mois-ci", value: String(callsThisMonth) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ce mois-ci</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="py-3 first:pt-0 sm:px-5 sm:py-0 sm:first:pt-0 sm:first:pl-0 sm:last:pr-0"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <stat.icon className="size-3.5 shrink-0" aria-hidden="true" />
                {stat.label}
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
