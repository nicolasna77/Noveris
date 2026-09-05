import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { slugify } from "@/lib/utils";

export type OrganizationSummary = { id: string; name: string };

export type ActiveOrganizationContext = {
  active: OrganizationSummary;
  organizations: OrganizationSummary[];
};

async function fetchMemberOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const memberships = await db.member.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => m.organization);
}

// Mémoïsé par requête (comme getSession) : le sélecteur d'organisation dans
// l'en-tête et chaque page qui scope ses données par organisation appellent
// cette fonction séparément sans redéclencher les mêmes requêtes.
//
// L'organisation "active" suit session.activeOrganizationId quand elle
// pointe vers une organisation dont l'utilisateur est encore membre, sinon
// retombe sur la première (ordre de création) — ça couvre aussi bien le cas
// où le cookie de session n'a jamais été positionné (comptes migrés avant
// cette fonctionnalité) que celui où l'organisation active vient d'être
// supprimée, sans avoir besoin d'écrire un cookie depuis un Server Component.
export const getActiveOrganizationContext = cache(
  async (): Promise<ActiveOrganizationContext | null> => {
    const session = await getSession();
    if (!session) return null;

    let organizations = await fetchMemberOrganizations(session.user.id);

    // Filet de sécurité : un client sans aucune organisation ne peut plus
    // rien faire sur le dashboard (chaque prestation appartient à une
    // organisation). Ne devrait arriver que pour un compte migré avant
    // l'ajout des organisations ou un échec silencieux à l'inscription —
    // on lui en crée une par défaut plutôt que de le bloquer.
    if (organizations.length === 0) {
      const name = session.user.name || "Mon entreprise";
      await auth.api.createOrganization({
        body: { name, slug: slugify(name), userId: session.user.id },
      });
      organizations = await fetchMemberOrganizations(session.user.id);
    }
    if (organizations.length === 0) return null;

    const active =
      organizations.find((o) => o.id === session.session.activeOrganizationId) ??
      organizations[0];

    return { active, organizations };
  }
);

export async function requireActiveOrganization(): Promise<ActiveOrganizationContext> {
  const ctx = await getActiveOrganizationContext();
  if (!ctx) throw new Error("Aucune organisation trouvée pour ce compte.");
  return ctx;
}
