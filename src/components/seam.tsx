import { cn } from "@/lib/utils";

export function Seam({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-1.5 w-full [mask-image:url(/stripes/stripes.svg)] mask-repeat mask-size-[16px_1px]",
        className,
      )}
    />
  );
}
