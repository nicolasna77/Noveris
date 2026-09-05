import Link from "next/link";
import { NoverisLogo } from "@/components/brand";
import { Seam } from "@/components/seam";

export function SiteFooter() {
  return (
    <footer className="bg-muted">
      <Seam className="bg-border" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <NoverisLogo />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Agence d&apos;automatisation pour artisans, coachs, indépendants
            et TPE/PME.
          </p>
        </div>
        <div className="flex gap-16 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">Offre</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/#prestations" className="hover:text-foreground">
                  Prestations
                </Link>
              </li>
              <li>
                <Link href="/#methode" className="hover:text-foreground">
                  Méthode
                </Link>
              </li>
              <li>
                <Link href="/#abonnement" className="hover:text-foreground">
                  Support prioritaire
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Compte</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Connexion
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-foreground">
                  Inscription
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-border px-4 py-6 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Noveris. Tous droits réservés.
      </div>
    </footer>
  );
}
