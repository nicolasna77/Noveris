import { CheckCheck, Download } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { bulkResolveHelpRequests } from "./actions";

// Les cases à cocher vivent dans les cartes, ce formulaire vit ici : elles
// s'y rattachent par l'attribut `form` du HTML. C'est ce qui permet d'avoir
// une sélection multiple sans imbriquer de formulaire (chaque carte contient
// déjà celui de la réponse) et sans état côté client — la sélection
// fonctionne même si le JavaScript n'a pas chargé.
export const BULK_FORM_ID = "bulk-resolve-help-requests";

export function BulkResolveBar({ hasOpenRequests }: { hasOpenRequests: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <form id={BULK_FORM_ID} action={bulkResolveHelpRequests}>
        {hasOpenRequests ? (
          <Button type="submit" variant="outline" size="sm">
            <CheckCheck data-icon="inline-start" />
            Marquer la sélection comme traitée
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune demande en attente sur cette page.
          </p>
        )}
      </form>

      {/* Un lien, pas un bouton : le navigateur télécharge la réponse de la
          route lui-même, sans code côté client. */}
      <Link
        href="/admin/export/demandes-aide"
        prefetch={false}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <Download data-icon="inline-start" />
        Exporter en CSV
      </Link>
    </div>
  );
}
