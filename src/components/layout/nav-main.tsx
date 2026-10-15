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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Role = "school" | "isla";
type NavItem = { title: string; href: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  school: [
    { title: "Home", href: "/", icon: HouseIcon },
    { title: "School profile", href: "/profile", icon: SchoolIcon },
    { title: "Map", href: "/map", icon: MapIcon },
    { title: "Analytics", href: "/analytics", icon: BarChart3Icon },
    { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
    { title: "Promotions", href: "/promo-offers", icon: TicketPercentIcon },
    { title: "Knowledge", href: "/knowledge", icon: BookOpenIcon },
    { title: "Billing", href: "/billing", icon: CreditCardIcon },
  ],
  isla: [
    { title: "Home", href: "/", icon: HouseIcon },
    { title: "Schools", href: "/schools", icon: Building2Icon },
    { title: "Map", href: "/map", icon: MapIcon },
    { title: "Reports", href: "/reports", icon: FlagIcon },
    { title: "Analytics", href: "/analytics", icon: BarChart3Icon },
    { title: "Jobs", href: "/jobs", icon: BriefcaseIcon },
    { title: "Promotions", href: "/offers", icon: TicketPercentIcon },
    { title: "Knowledge", href: "/knowledge", icon: BookOpenIcon },
    { title: "Billing", href: "/billing", icon: CreditCardIcon },
  ],
};

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavMain({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV[role].map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(pathname, item.href)}
                tooltip={item.title}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function NavStore() {
  const pathname = usePathname();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive(pathname, "/store")}
        tooltip="Store"
      >
        <Link href="/store">
          <ShoppingBagIcon />
          <span>ISLA Store</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
