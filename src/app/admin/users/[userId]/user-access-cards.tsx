import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleSelector } from "../role-selector";
import { BanControl } from "../ban-control";
import { PasswordResetControl } from "../password-reset-control";

// Les 3 actions qu'un admin ne peut pas s'appliquer à lui-même (voir
// requireAdminActingOnOther dans admin/users/actions.ts) — isSelf coupe
// court côté UI avant même d'essayer, plutôt que de laisser l'action
// échouer après coup.
export function UserAccessCards({
  user,
  isSelf,
}: {
  user: { id: string; role: string | null; banned: boolean | null; banReason: string | null };
  isSelf: boolean;
}) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rôle</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Vous ne pouvez pas modifier votre propre rôle.
            </p>
          ) : (
            <RoleSelector
              userId={user.id}
              currentRole={user.role === "ADMIN" ? "ADMIN" : "CLIENT"}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès au compte</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Vous ne pouvez pas vous bannir vous-même.
            </p>
          ) : (
            <BanControl
              userId={user.id}
              banned={!!user.banned}
              banReason={user.banReason}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Vous ne pouvez pas réinitialiser votre propre mot de passe
              ici.
            </p>
          ) : (
            <PasswordResetControl userId={user.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
