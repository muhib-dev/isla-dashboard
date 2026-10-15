"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenIcon,
  BriefcaseIcon,
  Building2Icon,
  ChevronRightIcon,
  CreditCardIcon,
  FileChartColumnIcon,
  HouseIcon,
  MapIcon,
  MegaphoneIcon,
  SchoolIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { navButtonClass, navGroupClass, navLabelClass } from "./nav-styles";

type Role = "school" | "isla";
type NavItem = { title: string; href: string; icon: LucideIcon };
type NavSection = { label: string; items: NavItem[] };

const OVERVIEW: NavSection = {
  label: "Overview",
  items: [
    { title: "Home", href: "/", icon: HouseIcon },
    { title: "Analytics", href: "/analytics", icon: BarChart3Icon },
    { title: "Map", href: "/map", icon: MapIcon },
  ],
};

const RESOURCES: NavSection = {
  label: "Resources",
  items: [
    { title: "Knowledge", href: "/knowledge", icon: BookOpenIcon },
    { title: "Store", href: "/store", icon: StoreIcon },
  ],
};

const NAV: Record<Role, NavSection[]> = {
  school: [
    OVERVIEW,
    {
      label: "Your school",
      items: [
        { title: "Profile", href: "/profile", icon: Building2Icon },
        { title: "Billing", href: "/billing", icon: CreditCardIcon },
        { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
        { title: "Promotions", href: "/promo-offers", icon: MegaphoneIcon },
      ],
    },
    RESOURCES,
  ],
  isla: [
    OVERVIEW,
    {
      label: "Members",
      items: [
        { title: "Schools", href: "/schools", icon: SchoolIcon },
        { title: "Reports", href: "/reports", icon: FileChartColumnIcon },
        { title: "Billing", href: "/billing", icon: CreditCardIcon },
        { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
        { title: "Promotions", href: "/offers", icon: MegaphoneIcon },
      ],
    },
    RESOURCES,
  ],
};

export const navSections = (role: Role) => NAV[role];

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** On phones the sidebar is a sheet; close it once a link is tapped. */
function useCloseMobile() {
  const { isMobile, setOpenMobile } = useSidebar();
  return () => {
    if (isMobile) setOpenMobile(false);
  };
}

export function NavMain({
  role,
  badges = {},
}: {
  role: Role;
  /** Count pills keyed by href, e.g. unpaid invoices on Billing. */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const closeMobile = useCloseMobile();
  return NAV[role].map((section) => (
    <SidebarGroup key={section.label} className={navGroupClass}>
      <SidebarGroupLabel className={navLabelClass}>
        {section.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {section.items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(pathname, item.href)}
                tooltip={item.title}
                className={navButtonClass}
              >
                <Link href={item.href} onClick={closeMobile}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {!!badges[item.href] && (
                <SidebarMenuBadge className="top-1/2! right-2.5 h-[22px] min-w-[22px] -translate-y-1/2 rounded-full bg-destructive-subtle px-1.5 text-xs font-semibold text-destructive peer-hover/menu-button:text-destructive peer-data-active/menu-button:text-destructive">
                  {badges[item.href]}
                  <span className="sr-only"> unpaid</span>
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

/** Topbar trail: section › page, from the same nav config the sidebar uses. */
export function Breadcrumbs({ role }: { role: Role }) {
  const pathname = usePathname();
  let trail: string[] = [];
  for (const section of NAV[role]) {
    const item = section.items.find((i) => isActive(pathname, i.href));
    if (item) {
      trail = [section.label, item.title];
      break;
    }
  }
  if (!trail.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
        {trail.map((label, i) => (
          <li key={label} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />}
            <span
              className={i === trail.length - 1 ? "truncate font-medium text-foreground" : "truncate max-sm:hidden"}
              aria-current={i === trail.length - 1 ? "page" : undefined}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
