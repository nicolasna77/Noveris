import Link from "next/link";
import { cn } from "@/lib/utils";

export function NoverisMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Noveris"
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M11 21V11L21 21V11"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="11" r="2" fill="var(--primary-foreground)" />
      <circle cx="21" cy="21" r="2" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function NoverisLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <NoverisMark className="size-7 shrink-0" />
      <span className="text-lg tracking-tight">Noveris</span>
    </Link>
  );
}
