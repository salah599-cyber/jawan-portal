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
  TrendingUp,
  Briefcase,
  Home,
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

const platformNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/portfolio/public-markets", label: "Public Markets", icon: TrendingUp },
  { href: "/portfolio/pe", label: "PE / VC Portfolio", icon: Briefcase },
  { href: "/lands", label: "Lands", icon: Map },
  { href: "/real-estate", label: "Real Estate", icon: Home },
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/companies", label: "Companies", icon: Factory },
  { href: "/loans", label: "Loans", icon: HandCoins },
  { href: "/cheques", label: "Cheques", icon: Banknote },
  { href: "/proposals", label: "Proposals", icon: Lightbulb },
  { href: "/assets/bank-details", label: "Bank Details", icon: Landmark },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

export function AppSidebar({
  showAdmin = false,
  showReports = true,
  showRealEstate = true,
}: {
  showAdmin?: boolean;
  showReports?: boolean;
  showRealEstate?: boolean;
}) {
  const pathname = usePathname();
  let items = platformNav;
  if (!showReports) items = items.filter((item) => item.href !== "/reports");
  if (!showRealEstate) items = items.filter((item) => item.href !== "/real-estate");
  const nav = showAdmin ? [...items, ...adminNav] : items;

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
