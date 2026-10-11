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

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
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

      <SidebarContent>
        <Suspense fallback={<NavSkeleton />}>
          <RoleNav />
        </Suspense>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>ISLA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Suspense fallback={<SidebarMenuSkeleton showIcon />}>
                <NavStore />
              </Suspense>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="theisla.org">
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

      <SidebarFooter>
        <p className="px-2 pb-1 text-xs leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
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
    <SidebarGroup>
      <SidebarMenu>
        {Array.from({ length: 6 }, (_, i) => (
          <SidebarMenuItem key={i}>
            <SidebarMenuSkeleton showIcon width={`${55 + ((i * 17) % 35)}%`} />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
