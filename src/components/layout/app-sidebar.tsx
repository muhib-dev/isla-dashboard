import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowUpRightIcon } from "lucide-react"
import { externalLinks } from "@/config/links"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getSession } from "@/server/session"
import { NavMain, NavStore } from "./nav-main"
import { navButtonClass, navGroupClass, navLabelClass } from "./nav-styles"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Image src="/isla-emblem.png" alt="ISLA" width={32} height={32} className="size-8 shrink-0" priority />
                <span className="grid leading-tight">
                  <span className="text-sm font-semibold tracking-tight">ISLA</span>
                  <span className="text-sm text-muted-foreground">School Hub</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-2">
        <Suspense fallback={<NavSkeleton />}>
          <RoleNav />
        </Suspense>

        <SidebarGroup className={`mt-auto pb-3 ${navGroupClass}`}>
          <SidebarGroupLabel className={navLabelClass}>ISLA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <Suspense fallback={<SidebarMenuSkeleton showIcon />}>
                <NavStore />
              </Suspense>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="theisla.org" className={navButtonClass}>
                  <a href={externalLinks.site} target="_blank" rel="noreferrer">
                    <ArrowUpRightIcon />
                    <span>theisla.org</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs leading-snug text-muted-foreground">
          Prototype with sample data. Schools and people are fictional.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

async function RoleNav() {
  const session = await getSession()
  return <NavMain role={session.role} />
}

function NavSkeleton() {
  return (
    <SidebarGroup className={navGroupClass}>
      <SidebarMenu className="gap-0.5">
        {Array.from({ length: 6 }, (_, i) => (
          <SidebarMenuItem key={i}>
            <SidebarMenuSkeleton showIcon width={`${55 + ((i * 17) % 35)}%`} />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
