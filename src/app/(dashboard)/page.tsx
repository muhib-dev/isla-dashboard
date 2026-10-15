import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-header";
import { HomeSkeleton } from "@/features/home/components/home-skeleton";
import { IslaHome } from "@/features/home/components/isla-home";
import { SchoolHome } from "@/features/home/components/school-home";
import { getSession } from "@/server/session";

export default function HomePage() {
  return (
    <PageBody>
      <Suspense fallback={<HomeSkeleton />}>
        <Home />
      </Suspense>
    </PageBody>
  );
}

async function Home() {
  const session = await getSession();
  const firstName = session.user.name.split(" ")[0];
  return session.role === "isla" ? (
    <IslaHome firstName={firstName} />
  ) : (
    <SchoolHome schoolId={session.schoolId!} firstName={firstName} />
  );
}
