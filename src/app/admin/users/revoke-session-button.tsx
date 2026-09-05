"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { revokeUserSessionAction } from "./actions";

export function RevokeSessionButton({
  userId,
  sessionToken,
}: {
  userId: string;
  sessionToken: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      try {
        await revokeUserSessionAction(userId, sessionToken);
        toast.success("Session révoquée.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleRevoke}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        "Révoquer"
      )}
    </Button>
  );
}
