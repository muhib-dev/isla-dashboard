import type { CSSProperties } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/** Sidebar + top bar around signed-in pages. `--app-header` lets full-height pages size below the 60px top bar. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* min-w-0: wide tables scroll inside their card instead of widening the page. */}
      <SidebarInset
        className="min-w-0"
        style={{ "--app-header": "60px" } as CSSProperties}
      >
        <Topbar />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
