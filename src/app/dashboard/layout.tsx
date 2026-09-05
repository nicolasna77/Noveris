import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/session";
import { requireActiveOrganization } from "@/lib/organization";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, { active, organizations }] = await Promise.all([
    requireUser(),
    requireActiveOrganization(),
  ]);
  const openHelpRequestCount = await db.helpRequest.count({
    where: { organizationId: active.id, status: "OPEN" },
  });

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
    >
      {children}
    </WorkspaceLayout>
  );
}
