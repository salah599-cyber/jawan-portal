"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/family/members", label: "Members & Beneficiaries", module: "members" as const },
  { href: "/family/succession", label: "Succession & Estate", module: "succession" as const },
];

export function FamilyModuleNav({
  showMembers = true,
  showSuccession = true,
}: {
  showMembers?: boolean;
  showSuccession?: boolean;
}) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => {
    if (item.module === "members") return showMembers;
    if (item.module === "succession") return showSuccession;
    return true;
  });

  if (items.length <= 1) return null;

  return (
    <nav className="w-full shrink-0 md:w-52">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Family Office
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
