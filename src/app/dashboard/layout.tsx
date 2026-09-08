import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";
import { getClientNotifications } from "@/lib/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, { active, organizations }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const [openHelpRequestCount, notifications] = await Promise.all([
    db.helpRequest.count({
      where: { organizationId: active.id, status: "OPEN" },
    }),
    // notificationsSeenAt n'est pas un champ better-auth : il ne fait pas
    // partie de session.user, d'où cette lecture directe.
    db.user
      .findUnique({
        where: { id: session.user.id },
        select: { notificationsSeenAt: true },
      })
      .then((user) => getClientNotifications(active.id, user?.notificationsSeenAt ?? null)),
  ]);

  return (
    <WorkspaceLayout
      sidebar={
        <DashboardSidebar
          isAdmin={isAdmin(session.user)}
          activeOrganization={active}
          organizations={organizations}
          openHelpRequestCount={openHelpRequestCount}
        />
      }
      name={session.user.name}
      email={session.user.email}
      notifications={notifications}
    >
      {children}
    </WorkspaceLayout>
  );
}
