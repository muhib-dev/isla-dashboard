import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/server/session";
import { UserMenu } from "./user-menu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="-ml-1.5" />
      <Separator orientation="vertical" className="mr-1" />
      <Suspense fallback={<Skeleton className="h-5 w-40" />}>
        <OrganizationName />
      </Suspense>
      <div className="ml-auto">
        <Suspense fallback={<Skeleton className="h-9 w-44" />}>
          <SessionMenu />
        </Suspense>
      </div>
    </header>
  );
}

async function OrganizationName() {
  const { organization } = await getSession();
  return <span className="truncate text-sm font-medium">{organization}</span>;
}

async function SessionMenu() {
  const { role, user } = await getSession();
  return <UserMenu role={role} user={user} />;
}
