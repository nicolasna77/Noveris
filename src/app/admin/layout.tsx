import { AdminSidebar } from "@/components/admin-sidebar";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, openHelpRequestCount] = await Promise.all([
    requireAdmin(),
    db.helpRequest.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <WorkspaceLayout
      sidebar={<AdminSidebar openHelpRequestCount={openHelpRequestCount} />}
      name={session.user.name}
      email={session.user.email}
    >
      {children}
    </WorkspaceLayout>
  );
}
