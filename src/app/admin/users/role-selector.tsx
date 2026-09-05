"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/utils";
import { setUserRoleAction } from "./actions";

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

  function handleChange(role: string | null) {
    if (role !== "ADMIN" && role !== "CLIENT") return;
    startTransition(async () => {
      try {
        await setUserRoleAction(userId, role);
        toast.success(`Rôle mis à jour : ${role}.`);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Select value={currentRole} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-40" aria-label="Rôle de l'utilisateur">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="CLIENT">CLIENT</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
      </SelectContent>
    </Select>
  );
}
