"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/utils";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_DESCRIPTIONS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/lib/email/types";
import type { NotificationPreferences } from "@/lib/email/preferences";
import { setNotificationPreference } from "./actions";

export function NotificationPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications par e-mail</CardTitle>
        <CardDescription>
          Choisissez les e-mails que Noveris peut vous envoyer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NOTIFICATION_TYPES.map((type) => (
          <NotificationToggleRow
            key={type}
            type={type}
            initialEnabled={initialPreferences[type] !== false}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function NotificationToggleRow({
  type,
  initialEnabled,
}: {
  type: NotificationType;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const previous = enabled;
    setEnabled(checked);
    startTransition(async () => {
      try {
        await setNotificationPreference(type, checked);
      } catch (err) {
        setEnabled(previous);
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {NOTIFICATION_TYPE_LABELS[type]}
        </p>
        <p className="text-xs text-muted-foreground">
          {NOTIFICATION_TYPE_DESCRIPTIONS[type]}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={isPending}
        aria-label={NOTIFICATION_TYPE_LABELS[type]}
      />
    </div>
  );
}
