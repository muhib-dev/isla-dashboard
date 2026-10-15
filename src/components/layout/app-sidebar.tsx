import { Suspense } from "react"
import { LifeBuoyIcon } from "lucide-react"
import { externalLinks } from "@/config/links"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getSchoolBilling } from "@/features/billing/queries"
import { getSession, type Session } from "@/server/session"
import { NavMain } from "./nav-main"
import { navButtonClass, navGroupClass } from "./nav-styles"
import { WorkspaceSwitcher, type Workspace } from "./workspace-switcher"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-[60px] justify-center border-b border-sidebar-border px-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Suspense fallback={<SidebarMenuSkeleton showIcon />}>
              <SessionWorkspace />
            </Suspense>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-2 pt-2">
        <Suspense fallback={<NavSkeleton />}>
          <RoleNav />
        </Suspense>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help & support" className={navButtonClass}>
              <a href={externalLinks.site} target="_blank" rel="noreferrer">
                <LifeBuoyIcon />
                <span>Help &amp; support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")

function workspaceOf(session: Session): Workspace {
  return session.role === "isla"
    ? { mark: "IS", name: "ISLA Staff", role: "Member services" }
    : { mark: initials(session.organization), name: session.organization, role: "School admin" }
}

async function SessionWorkspace() {
  const session = await getSession()
  return <WorkspaceSwitcher role={session.role} workspace={workspaceOf(session)} />
}

async function RoleNav() {
  const session = await getSession()
  if (session.role === "isla") return <NavMain role="isla" />
  const { invoices } = await getSchoolBilling(session.schoolId!)
  const unpaid = invoices.filter((i) => i.status === "open" || i.status === "overdue").length
  return <NavMain role="school" badges={{ "/billing": unpaid }} />
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
