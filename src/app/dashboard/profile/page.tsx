import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parsePreferences } from "@/lib/email/preferences";
import { AccountForm } from "./account-form";
import { PasswordForm } from "./password-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const session = await requireUser();

  const initialAccount = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? "",
  };

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { notificationPreferences: true },
  });
  const initialPreferences = parsePreferences(user.notificationPreferences);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <AccountForm initialAccount={initialAccount} />
      <NotificationPreferencesForm initialPreferences={initialPreferences} />
      <PasswordForm />

      <p className="mt-10 text-sm text-muted-foreground">
        Vos entreprises se gèrent depuis le sélecteur d&apos;organisation, en
        haut de la barre latérale.
      </p>
    </div>
  );
}
