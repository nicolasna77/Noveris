import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type ClientServiceStatus } from "@/lib/catalog";

const STATUS_VARIANT: Record<
  ClientServiceStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING_PAYMENT: "outline",
  CONFIGURING: "secondary",
  ACTIVE: "default",
  CANCELED: "destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ClientServiceStatus;
  className?: string;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
