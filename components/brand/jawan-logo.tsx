import Image from "next/image";
import { cn } from "@/lib/utils";

type JawanLogoProps = {
  className?: string;
  /** Visual size preset */
  size?: "sm" | "md" | "lg";
  /** Compact mark only (no wordmark) */
  markOnly?: boolean;
  priority?: boolean;
};

const sizes = {
  sm: { width: 140, height: 34, mark: 28 },
  md: { width: 200, height: 48, mark: 36 },
  lg: { width: 280, height: 67, mark: 48 },
} as const;

export function JawanLogo({
  className,
  size = "md",
  markOnly = false,
  priority = false,
}: JawanLogoProps) {
  const dims = sizes[size];

  if (markOnly) {
    return (
      <Image
        src="/brand/jawan_mark.png"
        alt="Jawan Investments"
        width={dims.mark}
        height={dims.mark}
        className={cn("shrink-0 object-contain", className)}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/brand/jawan_logo_transparent.png"
      alt="Jawan Investments"
      width={dims.width}
      height={dims.height}
      className={cn("h-auto w-auto max-w-full shrink-0 object-contain", className)}
      priority={priority}
    />
  );
}
