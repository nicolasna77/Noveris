import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NoverisLogo } from "@/components/brand";
import { PrestationsMenu } from "@/components/prestations-menu";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getSession, isAdmin } from "@/lib/session";
import { getCatalog } from "@/lib/get-catalog";

const NAV_LINKS = [
  { href: "/#methode", label: "Notre méthode" },
  { href: "/#abonnement", label: "Support prioritaire" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const [session, services] = await Promise.all([getSession(), getCatalog()]);
  const user = session
    ? {
        name: session.user.name,
        email: session.user.email,
        isAdmin: isAdmin(session.user),
      }
    : null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NoverisLogo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <PrestationsMenu services={services} />
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground"
            >
              Tableau de bord
            </Link>
          )}
          {user?.isAdmin && (
            <Link
              href="/admin"
              className="transition-colors hover:text-foreground"
            >
              Administration
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <SiteMobileNav
            services={services}
            loggedIn={!!user}
            isAdmin={!!user?.isAdmin}
          />
          <ThemeToggle />
          {user ? (
            <UserMenu name={user.name} email={user.email} />
          ) : (
            <>
              <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                Connexion
              </Button>
              <Button nativeButton={false} render={<Link href="/signup" />}>
                Créer un compte
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
