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
  Wallet,
  CalendarDays,
  Shield,
  Heart,
  Scroll,
  BookUser,
  DoorOpen,
  Send,
  Download,
  type LucideIcon,
} from "lucide-react";
import type { ModuleName } from "@/lib/permissions/types";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavChild = {
  href: string;
  label: string;
  icon?: "file" | "shield" | "users" | "scroll";
  module: ModuleName;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: ModuleName;
  modules?: ModuleName[];
  groupPrefix?: string;
  children?: NavChild[];
};

const platformNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, module: "CALENDAR" },
  { href: "/assets", label: "Assets", icon: Building2, module: "ASSETS" },
  { href: "/portfolio/public-markets", label: "Public Markets", icon: TrendingUp, module: "ASSETS" },
  { href: "/portfolio/pe", label: "PE / VC Portfolio", icon: Briefcase, module: "PRIVATE_EQUITY" },
  { href: "/portfolio/fund-lp", label: "Fund LP Investments", icon: Landmark, module: "FUND_LP" },
  {
    href: "/portfolio/exits",
    label: "Exits",
    icon: DoorOpen,
    modules: ["ASSETS", "PRIVATE_EQUITY", "REAL_ESTATE"],
  },
  { href: "/lands", label: "Lands", icon: Map, module: "LANDS" },
  {
    href: "/real-estate",
    label: "Real Estate",
    icon: Home,
    groupPrefix: "/real-estate",
    module: "REAL_ESTATE",
    children: [
      { href: "/real-estate", label: "Investment Portfolio", module: "REAL_ESTATE" },
      { href: "/real-estate/private", label: "Private Real Estate", module: "REAL_ESTATE" },
    ],
  },
  { href: "/cars", label: "Cars", icon: Car, module: "CARS" },
  { href: "/companies", label: "Companies", icon: Factory, module: "COMPANIES" },
  { href: "/loans", label: "Loans", icon: HandCoins, module: "LOANS" },
  { href: "/cheques", label: "Cheques", icon: Banknote, module: "CHEQUES" },
  { href: "/transfer-letters", label: "Transfer Letters", icon: Send, module: "ASSETS" },
  { href: "/cash", label: "Cash Management", icon: Wallet, module: "CASH_MANAGEMENT" },
  { href: "/proposals", label: "Proposals", icon: Lightbulb, module: "PROPOSALS" },
  { href: "/assets/bank-details", label: "Bank Details", icon: Landmark, module: "ASSETS" },
  {
    href: "/documents",
    label: "Documents",
    icon: FileText,
    groupPrefix: "/documents",
    children: [
      { href: "/documents", label: "Document Vault", icon: "file", module: "DOCUMENTS" },
      { href: "/documents/insurance", label: "Insurance Register", icon: "shield", module: "INSURANCE" },
    ],
  },
  { href: "/expenses", label: "Expenses", icon: Receipt, module: "EXPENSES" },
  {
    href: "/family/members",
    label: "Family",
    icon: Heart,
    groupPrefix: "/family",
    children: [
      { href: "/family/members", label: "Members & Beneficiaries", icon: "users", module: "FAMILY_MEMBERS" },
      { href: "/family/succession", label: "Succession & Estate", icon: "scroll", module: "SUCCESSION" },
    ],
  },
  { href: "/contacts", label: "Contacts", icon: BookUser, module: "CONTACTS" },
  { href: "/reports", label: "Reports", icon: BarChart3, module: "REPORTS" },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/download-requests", label: "Download Requests", icon: Download },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/documents") {
    return pathname === "/documents" || pathname === "/documents/";
  }
  if (href === "/real-estate") {
    return (
      pathname === "/real-estate" ||
      (pathname.startsWith("/real-estate/") && !pathname.startsWith("/real-estate/private"))
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function isGroupActive(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

function isDocumentsGroupActive(pathname: string) {
  return isGroupActive(pathname, "/documents");
}

function isFamilyGroupActive(pathname: string) {
  return isGroupActive(pathname, "/family");
}

function isRealEstateGroupActive(pathname: string) {
  return isGroupActive(pathname, "/real-estate");
}

function childIcon(icon?: "file" | "shield" | "users" | "scroll") {
  if (icon === "shield") return Shield;
  if (icon === "users") return Users;
  if (icon === "scroll") return Scroll;
  return FileText;
}

function canSeeNavItem(item: NavItem, moduleAccess: Record<ModuleName, boolean>) {
  if (item.children?.length) {
    return item.children.some((child) => moduleAccess[child.module]);
  }
  if (item.modules?.length) {
    return item.modules.some((module) => moduleAccess[module]);
  }
  if (item.module) {
    return moduleAccess[item.module];
  }
  return true;
}

function filterNavItems(items: NavItem[], moduleAccess: Record<ModuleName, boolean>): NavItem[] {
  return items
    .map((item) => {
      if (!item.children?.length) {
        return canSeeNavItem(item, moduleAccess) ? item : null;
      }

      const children = item.children.filter((child) => moduleAccess[child.module]);
      if (children.length === 0) return null;

      return { ...item, children };
    })
    .filter((item): item is NavItem => item != null);
}

export function AppSidebar({
  showAdmin = false,
  pendingDownloadRequests = 0,
  moduleAccess,
}: {
  showAdmin?: boolean;
  pendingDownloadRequests?: number;
  moduleAccess: Record<ModuleName, boolean>;
}) {
  const pathname = usePathname();
  const items = filterNavItems(platformNav, moduleAccess);
  const nav: NavItem[] = showAdmin ? [...items, ...(adminNav as NavItem[])] : items;

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
              {nav.map((item) => {
                if (item.children && item.children.length > 0) {
                  const groupActive =
                    item.groupPrefix === "/family"
                      ? isFamilyGroupActive(pathname)
                      : item.groupPrefix === "/real-estate"
                        ? isRealEstateGroupActive(pathname)
                        : isDocumentsGroupActive(pathname);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={groupActive}>
                        <Link href={item.children[0]?.href ?? item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.children.map((child) => {
                          const ChildIcon = childIcon(child.icon);
                          return (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(pathname, child.href)}
                              >
                                <Link href={child.href}>
                                  <ChildIcon className="size-4" />
                                  <span>{child.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        {item.href === "/admin/download-requests" && pendingDownloadRequests > 0 ? (
                          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                            {pendingDownloadRequests}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
