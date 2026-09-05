import Link from "next/link";
import { cn } from "@/lib/utils";

export function NoverisLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        N
      </span>
      <span className="text-lg tracking-tight">Noveris</span>
    </Link>
  );
}
