import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { externalLinks } from "@/config/links";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getOptionalSession } from "@/server/session";

/**
 * Public pages. Signed-in users see them inside the dashboard shell (they are in the nav);
 * anonymous visitors get a plain header. Everything rendered here must be safe for the public.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    // Reads the session cookie, so the frame streams in; the fallback is an empty page.
    <Suspense fallback={<div className="min-h-svh" />}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  const session = await getOptionalSession();
  return session ? (
    <DashboardShell>{children}</DashboardShell>
  ) : (
    <PublicFrame>{children}</PublicFrame>
  );
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between gap-3 border-b px-4 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-semibold whitespace-nowrap hover:opacity-80"
        >
          <ArrowLeftIcon className="size-4" />
          <span>
            ISLA<span className="hidden sm:inline"> School Hub</span>
          </span>
        </Link>
        <nav className="flex min-w-0 items-center gap-3 text-sm whitespace-nowrap text-muted-foreground sm:gap-5">
          <Link href="/map" className="hover:text-foreground">
            Map
          </Link>
          <Link href="/promo-offers" className="hover:text-foreground">
            Promotions
          </Link>
          <a href={externalLinks.site} className="hover:text-foreground">
            theisla.org
          </a>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-4 py-4 text-xs text-muted-foreground md:px-8">
        Listing or membership is not accreditation, certification or endorsement
        by ISLA.
      </footer>
    </div>
  );
}
