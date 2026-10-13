import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { OrgBilling } from "@/features/billing/components/org-billing";
import { SchoolBilling } from "@/features/billing/components/school-billing";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <PageBody>
      <Suspense fallback={<PageSkeleton />}>
        <Billing />
      </Suspense>
    </PageBody>
  );
}

async function Billing() {
  const session = await getSession();
  return session.role === "isla" ? (
    <OrgBilling />
  ) : (
    <SchoolBilling schoolId={session.schoolId!} />
  );
}
