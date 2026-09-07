import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { formatCents, formatDate } from "@/lib/catalog";
import { getMyInvoices, type InvoiceDTO } from "../get-invoices";

export const metadata: Metadata = { title: "Paiements" };

const STATUS_LABEL: Record<string, string> = {
  paid: "Payée",
  open: "En attente",
  draft: "Brouillon",
  uncollectible: "Irrécouvrable",
  void: "Annulée",
};

function InvoiceStatusBadge({ status }: { status: InvoiceDTO["status"] }) {
  const variant =
    status === "paid" ? "default" : status === "uncollectible" || status === "void" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status ? (STATUS_LABEL[status] ?? status) : "—"}</Badge>;
}

export default async function PaiementsPage() {
  const [session, { active: organization }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const invoices = await getMyInvoices(session.user.id, organization.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Paiements
        </h1>
        <p className="mt-1 text-muted-foreground">
          Vos factures, par solution.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
          <p className="font-medium text-foreground">
            Aucun paiement pour l&apos;instant
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos factures apparaîtront ici dès l&apos;activation d&apos;une
            solution.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card">
          <Table>
            <TableCaption className="sr-only">Historique des factures</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Solution</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Facture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-foreground">
                    {invoice.serviceName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums text-foreground">
                    {formatCents(invoice.amountPaidCents)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.hostedInvoiceUrl || invoice.invoicePdfUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl ?? invoice.invoicePdfUrl!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        Voir
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
