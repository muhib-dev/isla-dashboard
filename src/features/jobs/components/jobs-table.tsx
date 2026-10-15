import { StatusDot } from "@/components/shared/status";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOB_CATEGORY_LABELS, type Job } from "@/features/jobs/schema";
import { fmt } from "@/lib/format";

const STATUS = {
  open: ["success", "Open"],
  filled: ["neutral", "Filled"],
  closed: ["neutral", "Closed"],
} as const;

export function JobsTable({
  jobs,
  showSchool = false,
}: {
  jobs: (Job & { schoolName?: string })[];
  showSchool?: boolean;
}) {
  if (jobs.length === 0) {
    return (
      <Card className="py-14 text-center text-sm text-muted-foreground">
        No job postings yet.
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Position</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Posted</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Applicants</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const [tone, label] = STATUS[job.status];
            return (
              <TableRow key={job.id}>
                <TableCell className="pl-4 whitespace-normal">
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {showSchool && job.schoolName
                      ? job.schoolName
                      : job.type === "full_time"
                        ? "Full-time"
                        : "Part-time"}
                    <span className="tabular sm:hidden">
                      {" "}
                      · {job.applicants}{" "}
                      {job.applicants === 1 ? "applicant" : "applicants"}
                    </span>
                  </p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {JOB_CATEGORY_LABELS[job.category]}
                </TableCell>
                <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                  {fmt.date(job.postedOn)}
                </TableCell>
                <TableCell className="tabular hidden text-right sm:table-cell">
                  {job.applicants}
                </TableCell>
                <TableCell className="pr-4">
                  <StatusDot tone={tone}>{label}</StatusDot>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
