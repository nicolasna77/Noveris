"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/utils";
import { setUserRoleAction } from "./actions";

// Il n'existe que deux rôles (pas d'intermédiaire, voir prisma/schema.prisma)
// — promouvoir en ADMIN donne un accès total à tous les clients, paiements
// et catalogue, plus dangereux qu'un bannissement (BanControl, même
// dossier) qui a pourtant déjà sa confirmation. Seule la promotion vers
// ADMIN en demande une ici : rétrograder un ADMIN en CLIENT réduit son
// accès, pas besoin du même garde-fou.
export function RoleSelector({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: "ADMIN" | "CLIENT";
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingRole, setPendingRole] = useState<"ADMIN" | null>(null);

  function applyRole(role: "ADMIN" | "CLIENT") {
    startTransition(async () => {
      try {
        await setUserRoleAction(userId, role);
        toast.success(`Rôle mis à jour : ${role}.`);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingRole(null);
      }
    });
  }

  function handleChange(role: string | null) {
    if (role !== "ADMIN" && role !== "CLIENT") return;
    if (role === currentRole) return;
    if (role === "ADMIN") {
      setPendingRole("ADMIN");
      return;
    }
    applyRole(role);
  }

  return (
    <>
      <Select
        value={currentRole}
        onValueChange={handleChange}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="w-40" aria-label="Rôle de l'utilisateur">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CLIENT">CLIENT</SelectItem>
          <SelectItem value="ADMIN">ADMIN</SelectItem>
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingRole === "ADMIN"}
        onOpenChange={(open) => !open && setPendingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promouvoir en ADMIN ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette personne aura un accès total à tous les clients, tous les
              paiements et le catalogue des prestations — au même titre que
              vous. Cette portée d&apos;accès ne peut pas être restreinte
              (il n&apos;existe pas de rôle intermédiaire).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => applyRole("ADMIN")}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? "Promotion…" : "Promouvoir en ADMIN"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
