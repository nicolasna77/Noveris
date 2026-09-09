"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  ScrollText,
  Users,
} from "lucide-react";
import { NoverisLogo } from "@/components/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/services", label: "Solutions", icon: Package },
  { href: "/admin/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/aide", label: "Centre d'aide", icon: LifeBuoy },
  { href: "/admin/journal", label: "Journal", icon: ScrollText },
];

// Lien symétrique à "Administration" dans DashboardSidebar : un admin est
// aussi un compte utilisateur, ce lien lui permet de revenir à son propre
// tableau de bord sans repasser par une URL tapée à la main.
export function AdminSidebar({
  openHelpRequestCount,
}: {
  openHelpRequestCount: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <NoverisLogo className="px-2 py-1 group-data-[collapsible=icon]:justify-center [&>span:last-child]:group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.href === "/admin/aide" && openHelpRequestCount > 0 && (
                      <SidebarMenuBadge>{openHelpRequestCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Tableau de bord" render={<Link href="/dashboard" />}>
              <ArrowLeftRight />
              <span>Tableau de bord</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
