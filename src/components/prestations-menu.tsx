"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS, type ServiceCategory, type ServiceDTO } from "@/lib/catalog";

const MENU_CATEGORIES: ServiceCategory[] = ["COMMUNICATION", "INFORMATION"];

export function PrestationsMenu({ services }: { services: ServiceDTO[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground">
        Prestations
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {MENU_CATEGORIES.map((category) => ({
          category,
          categoryServices: services.filter((s) => s.category === category),
        }))
          // Une catégorie entièrement désactivée (voir /admin/services) ne
          // doit pas laisser un titre vide sans rien en dessous.
          .filter(({ categoryServices }) => categoryServices.length > 0)
          .map(({ category, categoryServices }, index) => (
            <Fragment key={category}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{CATEGORY_LABELS[category]}</DropdownMenuLabel>
                {categoryServices.map((service) => (
                  <DropdownMenuItem
                    key={service.slug}
                    render={<Link href={`/prestations/${service.slug}`} />}
                  >
                    {service.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </Fragment>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
