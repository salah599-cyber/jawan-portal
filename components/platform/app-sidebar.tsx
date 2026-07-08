"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Receipt,
  BarChart3,
  Users,
  ScrollText,
  Landmark,
  Map,
  Car,
  Factory,
  HandCoins,
  Banknote,
  Lightbulb,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { ModuleName } from "@/lib/permissions/types";

const platformNav: { href: string; label: string; icon: typeof LayoutDashboard; module: ModuleName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { href: "/assets", label: "Assets", icon: Building2, module: "ASSETS" },
  { href: "/lands", label: "Lands", icon: Map, module: "LANDS" },
  { href: "/cars", label: "Cars", icon: Car, module: "CARS" },
  { href: "/companies", label: "Companies", icon: Factory, module: "COMPANIES" },
  { href: "/loans", label: "Loans", icon: HandCoins, module: "LOANS" },
  { href: "/cheques", label: "Cheques", icon: Banknote, module: "CHEQUES" },
  { href: "/proposals", label: "Proposals", icon: Lightbulb, module: "PROPOSALS" },
  { href: "/assets/bank-details", label: "Bank Details", icon: Landmark, module: "ASSETS" },
  { href: "/documents", label: "Documents", icon: FileText, module: "DOCUMENTS" },
  { href: "/expenses", label: "Expenses", icon: Receipt, module: "EXPENSES" },
  { href: "/reports", label: "Reports", icon: BarChart3, module: "REPORTS" },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

export function AppSidebar({
  showAdmin = false,
  moduleAccess,
}: {
  showAdmin?: boolean;
  moduleAccess?: Partial<Record<ModuleName, boolean>>;
}) {
  const pathname = usePathname();
  const visiblePlatformNav = moduleAccess
    ? platformNav.filter((item) => moduleAccess[item.module] !== false)
    : platformNav;
  const nav = showAdmin ? [...visiblePlatformNav, ...adminNav] : visiblePlatformNav;

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jawan Investments</p>
          <p className="text-lg font-semibold">Family Office</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || pathname.startsWith(item.href + "/")}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
