"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { MobileNavLink } from "@/components/mobile-nav-link";
import { CATEGORY_LABELS, type ServiceCategory, type ServiceDTO } from "@/lib/catalog";

const MENU_CATEGORIES: ServiceCategory[] = ["COMMUNICATION", "INFORMATION"];

const NAV_LINKS = [
  { href: "/#methode", label: "Notre méthode" },
  { href: "/#abonnement", label: "Support prioritaire" },
  { href: "/contact", label: "Contact" },
];

// Reprend les liens masqués par `hidden md:flex` dans SiteHeader (menu
// Prestations inclus) — sans lui, ils étaient entièrement inaccessibles en
// dessous de md, faute de tout repli mobile.
export function SiteMobileNav({
  services,
  loggedIn,
  isAdmin,
}: {
  services: ServiceDTO[];
  loggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Ouvrir le menu"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-xs">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <nav className="flex flex-col gap-6 text-sm">
            {MENU_CATEGORIES.map((category) => (
              <div key={category}>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {CATEGORY_LABELS[category]}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {services.filter((s) => s.category === category).map(
                    (service) => (
                      <li key={service.slug}>
                        <MobileNavLink href={`/prestations/${service.slug}`}>
                          {service.name}
                        </MobileNavLink>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}

            <Separator />

            <ul className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <MobileNavLink href={link.href}>{link.label}</MobileNavLink>
                </li>
              ))}
              {loggedIn && (
                <li>
                  <MobileNavLink href="/dashboard">Tableau de bord</MobileNavLink>
                </li>
              )}
              {isAdmin && (
                <li>
                  <MobileNavLink href="/admin">Administration</MobileNavLink>
                </li>
              )}
            </ul>
          </nav>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
