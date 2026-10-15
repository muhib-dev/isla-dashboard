import type { Metadata } from "next";
import { Suspense } from "react";
import { FlagIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolsExplorer } from "@/features/schools/components/schools-explorer";
import {
  AddSchoolDialog,
  ReportSchoolDialog,
} from "@/features/schools/components/submission-forms";
import {
  getPublicSearchIndex,
  getSchoolSearchIndex,
} from "@/features/schools/queries";
import { seedGeoContext } from "@/features/schools/search/geo-server";
import { getOptionalSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Islamic school map",
  description:
    "Find full-time Islamic schools across the United States and Canada on one map.",
};

/**
 * Open to everyone: anonymous visitors and school admins get public data only (see
 * getPublicSearchIndex); ISLA staff get the full index.
 */
export default function PublicMapPage({ searchParams }: PageProps<"/map">) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <PublicMap searchParams={searchParams} />
    </Suspense>
  );
}

/** Mirrors the explorer's layout: search header over the map on phones, list panel left of it on desktop. */
function MapSkeleton() {
  return (
    <div className="flex h-[calc(100svh-var(--app-header,56px))] flex-col md:flex-row">
      <div className="space-y-3 border-b bg-card p-3 md:w-100 md:border-r md:border-b-0 md:p-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="hidden h-16 w-full md:block" />
        <Skeleton className="hidden h-16 w-full md:block" />
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-none" />
    </div>
  );
}

async function PublicMap({
  searchParams,
}: Pick<PageProps<"/map">, "searchParams">) {
  const [raw, session] = await Promise.all([
    searchParams,
    getOptionalSession(),
  ]);
  // ISLA staff see every membership status and open the staff profile; everyone else gets public data.
  const staff = session?.role === "isla";
  const [docs, geoSeed] = await Promise.all([
    staff ? getSchoolSearchIndex(true) : getPublicSearchIndex(),
    seedGeoContext(typeof raw.q === "string" ? raw.q : undefined),
  ]);

  return (
    <SchoolsExplorer
      docs={docs}
      geoSeed={geoSeed}
      audience={staff ? "staff" : "public"}
      mode="map"
      title={session ? "Map" : "Islamic school map"}
      actions={
        <>
          <AddSchoolDialog
            trigger={
              <Button variant="outline" size="sm">
                <PlusIcon /> Add a school
              </Button>
            }
          />
          <ReportSchoolDialog
            trigger={
              <Button variant="outline" size="sm">
                <FlagIcon /> Report a school
              </Button>
            }
          />
        </>
      }
    />
  );
}
