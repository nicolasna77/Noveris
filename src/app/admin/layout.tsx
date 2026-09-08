import { AdminSidebar } from "@/components/admin-sidebar";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getAdminNotifications } from "@/lib/notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, openHelpRequestCount] = await Promise.all([
    requireAdmin(),
    db.helpRequest.count({ where: { status: "OPEN" } }),
  ]);
  // notificationsSeenAt n'est pas un champ better-auth : il ne fait pas
  // partie de session.user, d'où cette lecture directe.
  const viewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { notificationsSeenAt: true },
  });
  const notifications = await getAdminNotifications(viewer?.notificationsSeenAt ?? null);

  return (
    <WorkspaceLayout
      sidebar={<AdminSidebar openHelpRequestCount={openHelpRequestCount} />}
      name={session.user.name}
      email={session.user.email}
      notifications={notifications}
    >
      {children}
    </WorkspaceLayout>
  );
}
