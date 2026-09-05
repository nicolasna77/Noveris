import Link from "next/link";
import { SheetClose } from "@/components/ui/sheet";

// Utilisé par SiteMobileNav. `nativeButton={false}` : SheetClose s'attend
// par défaut à ce que `render` rende un vrai <button> ; ici on lui fait
// rendre un <Link> (navigation, pas une action de bouton), d'où
// l'avertissement Base UI sans ce prop.
export function MobileNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <SheetClose
      render={<Link href={href} />}
      nativeButton={false}
      className="block rounded-2xl px-3 py-2.5 text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </SheetClose>
  );
}
