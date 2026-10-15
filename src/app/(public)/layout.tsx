import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { externalLinks } from "@/config/links"
import { getOptionalSession } from "@/server/session"

/** Anonymous pages: no sidebar. Everything rendered here must be safe for the public. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between gap-3 border-b px-4 md:px-8">
        <span className="shrink-0 font-semibold whitespace-nowrap">
          ISLA<span className="hidden sm:inline"> School Hub</span>
        </span>
        <nav className="flex min-w-0 items-center gap-3 text-sm whitespace-nowrap text-muted-foreground sm:gap-5">
          <Link href="/map" className="hover:text-foreground">Map</Link>
          <Link href="/promo-offers" className="hover:text-foreground">Promotions</Link>
          <a href={externalLinks.site} className="hidden hover:text-foreground sm:inline">theisla.org</a>
          {/* Only signed-in users see this; reads the session cookie, so it streams in separately. */}
          <Suspense fallback={null}>
            <DashboardLink />
          </Suspense>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-4 py-4 text-xs text-muted-foreground md:px-8">
        Listing or membership is not accreditation, certification or endorsement by ISLA. Map © OpenStreetMap contributors.
      </footer>
    </div>
  )
}

async function DashboardLink() {
  const session = await getOptionalSession()
  if (!session) return null
  return (
    <Button asChild size="sm">
      <Link href={session.role === "isla" ? "/schools" : "/"}>
        <ArrowLeftIcon />
        <span className="sm:hidden">Dashboard</span>
        <span className="hidden sm:inline">Back to dashboard</span>
      </Link>
    </Button>
  )
}
