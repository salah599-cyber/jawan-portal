import { cn } from "@/lib/utils";

export function FilterToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>{children}</div>
  );
}
