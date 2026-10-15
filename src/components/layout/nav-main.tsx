"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenIcon,
  BriefcaseIcon,
  Building2Icon,
  FlagIcon,
  MapIcon,
  CreditCardIcon,
  HouseIcon,
  SchoolIcon,
  ShoppingBagIcon,
  TicketPercentIcon,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { navButtonClass, navGroupClass, navLabelClass } from "./nav-styles";

type Role = "school" | "isla";
type NavItem = { title: string; href: string; icon: LucideIcon };
type NavSection = { label: string; items: NavItem[] };

const NAV: Record<Role, NavSection[]> = {
  school: [
    {
      label: "Overview",
      items: [
        { title: "Home", href: "/", icon: HouseIcon },
        { title: "Analytics", href: "/analytics", icon: BarChart3Icon },
        { title: "Map", href: "/map", icon: MapIcon },
      ],
    },
    {
      label: "Your school",
      items: [
        { title: "My school", href: "/profile", icon: SchoolIcon },
        { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
        { title: "Promotions", href: "/promo-offers", icon: TicketPercentIcon },
      ],
    },
    {
      label: "Resources & billing",
      items: [
        { title: "Knowledge", href: "/knowledge", icon: BookOpenIcon },
        { title: "Billing", href: "/billing", icon: CreditCardIcon },
      ],
    },
  ],
  isla: [
    {
      label: "Overview",
      items: [
        { title: "Home", href: "/", icon: HouseIcon },
        { title: "Analytics", href: "/analytics", icon: BarChart3Icon },
        { title: "Map", href: "/map", icon: MapIcon },
      ],
    },
    {
      label: "Members",
      items: [
        { title: "Schools", href: "/schools", icon: Building2Icon },
        { title: "Reports", href: "/reports", icon: FlagIcon },
        { title: "Billing", href: "/billing", icon: CreditCardIcon },
      ],
    },
    {
      label: "Content",
      items: [
        { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
        { title: "Promotions", href: "/offers", icon: TicketPercentIcon },
        { title: "Knowledge", href: "/knowledge", icon: BookOpenIcon },
      ],
    },
  ],
};

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

export function NavMain({ role }: { role: Role }) {
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
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

export function NavStore() {
  const pathname = usePathname();
  const closeMobile = useCloseMobile();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive(pathname, "/store")}
        tooltip="Store"
        className={navButtonClass}
      >
        <Link href="/store" onClick={closeMobile}>
          <ShoppingBagIcon />
          <span>ISLA Store</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
