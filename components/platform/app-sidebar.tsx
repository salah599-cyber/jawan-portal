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
  type LucideIcon,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  groupPrefix?: string;
  children?: { href: string; label: string; icon?: "file" | "shield" | "users" | "scroll" }[];
};

const platformNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/portfolio/public-markets", label: "Public Markets", icon: TrendingUp },
  { href: "/portfolio/pe", label: "PE / VC Portfolio", icon: Briefcase },
  { href: "/portfolio/fund-lp", label: "Fund LP Investments", icon: Landmark },
  { href: "/portfolio/exits", label: "Exits", icon: DoorOpen },
  { href: "/lands", label: "Lands", icon: Map },
  { href: "/real-estate", label: "Real Estate", icon: Home, groupPrefix: "/real-estate", children: [
    { href: "/real-estate", label: "Investment Portfolio" },
    { href: "/real-estate/private", label: "Private Real Estate" },
  ]},
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/companies", label: "Companies", icon: Factory },
  { href: "/loans", label: "Loans", icon: HandCoins },
  { href: "/cheques", label: "Cheques", icon: Banknote },
  { href: "/transfer-letters", label: "Transfer Letters", icon: Send },
  { href: "/cash", label: "Cash Management", icon: Wallet },
  { href: "/proposals", label: "Proposals", icon: Lightbulb },
  { href: "/assets/bank-details", label: "Bank Details", icon: Landmark },
  {
    href: "/documents",
    label: "Documents",
    icon: FileText,
    groupPrefix: "/documents",
    children: [
      { href: "/documents", label: "Document Vault", icon: "file" as const },
      { href: "/documents/insurance", label: "Insurance Register", icon: "shield" as const },
    ],
  },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  {
    href: "/family/members",
    label: "Family",
    icon: Heart,
    groupPrefix: "/family",
    children: [
      { href: "/family/members", label: "Members & Beneficiaries", icon: "users" as const },
      { href: "/family/succession", label: "Succession & Estate", icon: "scroll" as const },
    ],
  },
  { href: "/contacts", label: "Contacts", icon: BookUser },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: Users },
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

export function AppSidebar({
  showAdmin = false,
  showReports = true,
  showCalendar = true,
  showDocumentsVault = true,
  showInsuranceRegister = true,
  showFamilyMembers = false,
  showSuccession = false,
  showContacts = false,
}: {
  showAdmin?: boolean;
  showReports?: boolean;
  showCalendar?: boolean;
  showDocumentsVault?: boolean;
  showInsuranceRegister?: boolean;
  showFamilyMembers?: boolean;
  showSuccession?: boolean;
  showContacts?: boolean;
}) {
  const pathname = usePathname();

  let items = platformNav
    .map((item) => {
      if (item.href === "/documents" && item.children) {
        const children = item.children.filter((child) => {
          if (child.href === "/documents") return showDocumentsVault;
          if (child.href === "/documents/insurance") return showInsuranceRegister;
          return true;
        });
        if (children.length === 0) return null;
        return { ...item, children };
      }

      if (item.href === "/family/members" && item.children) {
        const children = item.children.filter((child) => {
          if (child.href === "/family/members") return showFamilyMembers;
          if (child.href === "/family/succession") return showSuccession;
          return true;
        });
        if (children.length === 0) return null;
        return { ...item, children };
      }

      return item;
    })
    .filter((item): item is NavItem => item != null);

  if (!showCalendar) items = items.filter((item) => item.href !== "/calendar");
  if (!showReports) items = items.filter((item) => item.href !== "/reports");
  if (!showContacts) items = items.filter((item) => item.href !== "/contacts");
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
