"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  CircleXIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PlusCircleIcon,
  SearchIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { StatusDot } from "@/components/shared/status";
import {
  TablePagination,
  usePagination,
} from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { externalLinks } from "@/config/links";
import { closeJob } from "@/features/jobs/actions";
import {
  JOB_CATEGORY_LABELS,
  JOB_TYPE_LABELS,
  jobDisplayStatus,
  jobExpiry,
  type Job,
  type JobDisplayStatus,
} from "@/features/jobs/schema";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

const EXPIRES_SOON_DAYS = 7;

type JobType = Job["type"];

const STATUS: Record<
  JobDisplayStatus,
  ["success" | "neutral", string, string?]
> = {
  live: ["success", "Live"],
  draft: ["neutral", "Draft"],
  expired: ["neutral", "Expired", "bg-muted-foreground"],
  filled: ["neutral", "Filled", "bg-muted-foreground/50"],
  closed: ["neutral", "Closed", "bg-muted-foreground/50"],
};

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function Expires({ job, today }: { job: Job; today: number }) {
  const status = jobDisplayStatus(job, today);
  const { iso, daysLeft } = jobExpiry(job.postedOn, today);
  const date = dayMonth.format(new Date(iso));
  if (status === "live" && daysLeft <= EXPIRES_SOON_DAYS) {
    return (
      <span className="font-medium text-warning" title={fmt.date(iso)}>
        {daysLeft <= 0
          ? "Today"
          : `In ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`}
      </span>
    );
  }
  if (status === "live")
    return <span className="text-muted-foreground">{date}</span>;
  if (status === "expired")
    return <span className="text-muted-foreground">Ended {date}</span>;
  return <span className="text-muted-foreground">—</span>;
}

function RowMenu({ job, live }: { job: Job; live: boolean }) {
  const [pending, startTransition] = useTransition();

  function close(status: "filled" | "closed") {
    startTransition(async () => {
      const result = await closeJob(job.id, status);
      if (result.ok)
        toast.success(
          status === "filled"
            ? `“${job.title}” marked as filled`
            : `“${job.title}” taken off the job board`,
        );
      else toast.error(result.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${job.title}`}
          disabled={pending}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <a href={externalLinks.jobPortal} target="_blank" rel="noreferrer">
            <ExternalLinkIcon /> View on job board
          </a>
        </DropdownMenuItem>
        {live && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => close("filled")}>
              <CheckCircle2Icon /> Mark as filled
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => close("closed")}>
              <CircleXIcon /> Close post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterMenu<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Record<T, string>;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <PlusCircleIcon />
          {label}
          {selected.length > 0 && (
            <span className="rounded-sm bg-secondary px-1.5 text-[13px] text-muted-foreground">
              {selected.length === 1
                ? options[selected[0]]
                : `${selected.length} selected`}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        {(Object.entries(options) as [T, string][]).map(([key, text]) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={selected.includes(key)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...selected, key]
                  : selected.filter((s) => s !== key),
              )
            }
          >
            {text}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-lg border bg-surface-2">
        <BriefcaseBusinessIcon
          className="size-7 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-[15px] text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export function JobsTable({
  jobs,
  today,
  showSchool = false,
}: {
  jobs: (Job & { schoolName?: string })[];
  /** Request time (epoch ms), passed from the server so expiry renders the same on both sides. */
  today: number;
  showSchool?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<JobDisplayStatus[]>([]);
  const [types, setTypes] = useState<JobType[]>([]);

  const statusOptions = useMemo(() => {
    const present = new Set(jobs.map((j) => jobDisplayStatus(j, today)));
    return Object.fromEntries(
      (Object.keys(STATUS) as JobDisplayStatus[])
        .filter((s) => present.has(s))
        .map((s) => [s, STATUS[s][1]]),
    ) as Record<JobDisplayStatus, string>;
  }, [jobs, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (job) =>
        (statuses.length === 0 ||
          statuses.includes(jobDisplayStatus(job, today))) &&
        (types.length === 0 || types.includes(job.type)) &&
        (!q ||
          job.title.toLowerCase().includes(q) ||
          JOB_CATEGORY_LABELS[job.category].toLowerCase().includes(q) ||
          job.schoolName?.toLowerCase().includes(q)),
    );
  }, [jobs, query, statuses, types, today]);

  const pager = usePagination(
    filtered,
    JSON.stringify([query, statuses, types]),
  );
  const rows = pager.rows;

  const filtering = query !== "" || statuses.length > 0 || types.length > 0;
  const reset = () => {
    setQuery("");
    setStatuses([]);
    setTypes([]);
  };

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          title="No job postings yet"
          hint={
            showSchool
              ? "Open positions from member schools will appear here."
              : "Post a vacancy to list it on the ISLA careers board."
          }
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="relative w-full sm:w-70">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={showSchool ? "Search roles or schools" : "Search roles"}
            aria-label="Search jobs"
            className="h-9 pl-9"
          />
        </div>
        <FilterMenu
          label="Status"
          options={statusOptions}
          selected={statuses}
          onChange={setStatuses}
        />
        <FilterMenu
          label="Type"
          options={JOB_TYPE_LABELS}
          selected={types}
          onChange={setTypes}
        />
        {filtering && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset <XIcon />
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching jobs"
          hint="Try a different search or clear the filters."
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Role</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Applicants
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Views
              </TableHead>
              <TableHead className="hidden md:table-cell">Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 pr-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((job) => {
              const status = jobDisplayStatus(job, today);
              const [tone, label, dot] = STATUS[status];
              const draft = status === "draft";
              return (
                <TableRow key={job.id}>
                  <TableCell className="h-14 pl-4 whitespace-normal">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                      {job.title}
                      {job.featured && status === "live" && (
                        <Badge variant="highlight">
                          <StarIcon className="size-3" aria-hidden />
                          Featured
                        </Badge>
                      )}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {showSchool && job.schoolName
                        ? job.schoolName
                        : JOB_CATEGORY_LABELS[job.category]}
                      <span className="md:hidden">
                        {" "}
                        · {JOB_TYPE_LABELS[job.type]}
                      </span>
                      <span className="sm:hidden">
                        {" "}
                        · {job.applicants}{" "}
                        {job.applicants === 1 ? "applicant" : "applicants"}
                      </span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {JOB_TYPE_LABELS[job.type]}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden text-right sm:table-cell",
                      draft ? "text-muted-foreground" : "font-medium",
                    )}
                  >
                    {draft ? "—" : fmt.number(job.applicants)}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
                    {draft ? "—" : fmt.number(job.views)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Expires job={job} today={today} />
                  </TableCell>
                  <TableCell>
                    <StatusDot
                      tone={tone}
                      dotClassName={dot}
                      className={cn(status !== "live" && "text-muted-foreground")}
                    >
                      {label}
                    </StatusDot>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {!draft && <RowMenu job={job} live={status === "live"} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <TablePagination pager={pager} unfiltered={jobs.length} />
    </div>
  );
}
