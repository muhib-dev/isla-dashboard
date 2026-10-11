import { Suspense } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { getSession } from "@/server/session"
import { UserMenu } from "./user-menu"

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
      <SidebarTrigger className="-ml-1.5" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Prototype · sample data
      </span>
      <div className="ml-auto">
        <Suspense fallback={<Skeleton className="h-9 w-44" />}>
          <SessionMenu />
        </Suspense>
      </div>
    </header>
  )
}

async function SessionMenu() {
  const { role, user } = await getSession()
  return <UserMenu role={role} user={user} />
}
