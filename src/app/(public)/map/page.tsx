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

/** Mirrors the explorer's split: list panel left, map right. */
function MapSkeleton() {
  return (
    <div className="flex flex-col md:h-[calc(100svh_-_var(--app-header,56px))] md:flex-row">
      <div className="space-y-3 border-b bg-card p-5 md:w-[400px] md:border-r md:border-b-0">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-[70svh] min-h-112 rounded-none md:h-auto md:flex-1" />
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
