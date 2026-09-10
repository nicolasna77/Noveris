import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-1 flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
        {children}
      </CardHeader>
    </Card>
  );
}
