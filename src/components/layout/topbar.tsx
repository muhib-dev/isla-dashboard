import { Suspense } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrgBilling, getSchoolBilling } from "@/features/billing/queries";
import { getSchoolJobs } from "@/features/jobs/queries";
import { listSchoolReports, listSchools } from "@/features/schools/queries";
import { fmt } from "@/lib/format";
import { getSession, type Session } from "@/server/session";
import { Breadcrumbs } from "./nav-main";
import { Notifications, type Notice } from "./notifications";
import { ThemeToggle } from "./theme-toggle";
import { TopbarSearch, type SearchItem } from "./topbar-search";
import { UserMenu } from "./user-menu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b bg-card px-4 md:pr-6">
      <SidebarTrigger className="size-9 text-muted-foreground" />
      <Suspense fallback={<Skeleton className="h-5 w-40" />}>
        <SessionTrail />
      </Suspense>
      <div className="ml-auto flex items-center gap-2">
        <Suspense fallback={<Skeleton className="h-9 w-9 md:w-70" />}>
          <SessionTools />
        </Suspense>
        <ThemeToggle />
        <div className="h-8 w-px bg-border" aria-hidden />
        <Suspense fallback={<Skeleton className="h-9 w-44" />}>
          <SessionMenu />
        </Suspense>
      </div>
    </header>
  );
}

async function SessionTrail() {
  const { role } = await getSession();
  return <Breadcrumbs role={role} />;
}

async function SessionMenu() {
  const { role, user } = await getSession();
  return <UserMenu role={role} user={user} />;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function SessionTools() {
  const session = await getSession();
  const { items, notices } =
    session.role === "isla"
      ? await staffTools()
      : await schoolTools(session);
  return (
    <>
      <TopbarSearch
        role={session.role}
        items={items}
        placeholder={
          session.role === "isla"
            ? "Search schools, invoices, jobs"
            : "Search invoices, jobs, pages"
        }
      />
      <Notifications notices={notices} />
    </>
  );
}

async function staffTools() {
  const [schools, org, reports] = await Promise.all([
    listSchools({}),
    getOrgBilling(),
    listSchoolReports(),
  ]);
  const items: SearchItem[] = [
    ...schools.map((s) => ({
      group: "Schools",
      label: s.name,
      sub: `${s.city}, ${s.state}`,
      href: `/schools/${s.id}`,
    })),
    ...org.unpaid.map((i) => ({
      group: "Unpaid invoices",
      label: `${i.number} · ${i.schoolName}`,
      sub: fmt.currency(i.amount),
      href: "/billing",
    })),
  ];
  const overdue = org.unpaid.filter((i) => i.status === "overdue");
  const grace = schools.filter((s) => s.membership.status === "grace");
  const pending = reports.filter((r) => r.status === "pending");
  const notices: Notice[] = [
    overdue.length > 0 && {
      id: "overdue",
      kind: "overdue",
      title: `${plural(overdue.length, "invoice")} overdue`,
      sub: `${fmt.currency(org.overdue)} outstanding`,
      href: "/billing",
    },
    grace.length > 0 && {
      id: "grace",
      kind: "grace",
      title: `${plural(grace.length, "school")} in grace period`,
      sub: "Membership dues not yet paid",
      href: "/schools?status=grace",
    },
    pending.length > 0 && {
      id: "reports",
      kind: "report",
      title: `${plural(pending.length, "map report")} to review`,
      sub: "Suggested schools and changes",
      href: "/reports",
    },
  ].filter((n): n is Notice => !!n);
  return { items, notices };
}

async function schoolTools(session: Session) {
  const schoolId = session.schoolId!;
  const [{ invoices }, jobs] = await Promise.all([
    getSchoolBilling(schoolId),
    getSchoolJobs(schoolId),
  ]);
  const items: SearchItem[] = [
    ...invoices.map((i) => ({
      group: "Invoices",
      label: `${i.number} · ${i.description}`,
      sub: fmt.currency(i.amount),
      href: "/billing",
    })),
    ...jobs.map((j) => ({
      group: "Jobs",
      label: j.title,
      sub: fmt.date(j.postedOn),
      href: "/jobs",
    })),
  ];
  const overdue = invoices.filter((i) => i.status === "overdue");
  const open = invoices.filter((i) => i.status === "open");
  const notices: Notice[] = [
    overdue.length > 0 && {
      id: "overdue",
      kind: "overdue",
      title: `${plural(overdue.length, "invoice")} overdue`,
      sub: overdue.map((i) => i.number).join(", "),
      href: "/billing",
    },
    open.length > 0 && {
      id: "due",
      kind: "due",
      title: `${plural(open.length, "invoice")} due`,
      sub: fmt.currency(open.reduce((n, i) => n + i.amount, 0)),
      href: "/billing",
    },
  ].filter((n): n is Notice => !!n);
  return { items, notices };
}
