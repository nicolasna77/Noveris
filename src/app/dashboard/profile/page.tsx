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

  // notificationPreferences n'est pas un champ better-auth (pas déclaré dans
  // user.additionalFields, src/lib/auth.ts) — il ne fait donc pas partie de
  // session.user, d'où cette requête directe.
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { notificationPreferences: true },
  });
  const initialPreferences = parsePreferences(user.notificationPreferences);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Mon profil
      </h1>
      <p className="mt-1 text-muted-foreground">
        Gérez votre compte. Vos entreprises se gèrent depuis le sélecteur
        d&apos;organisation en haut du tableau de bord.
      </p>

      <div className="mt-8 space-y-6">
        <AccountForm initialAccount={initialAccount} />
        <PasswordForm />
        <NotificationPreferencesForm initialPreferences={initialPreferences} />
      </div>
    </div>
  );
}
