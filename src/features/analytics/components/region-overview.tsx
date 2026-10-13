import { Stat } from "@/components/shared/stat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getNetworkOverview,
  getRegionStats,
} from "@/features/analytics/queries";
import { getMapCoverage } from "@/features/schools/queries";
import { REGION_LABELS } from "@/features/schools/schema";
import { fmt } from "@/lib/format";
import { MembershipByRegion } from "./membership-by-region";
import { RegionChart } from "./region-chart";

export async function RegionOverview() {
  const [regions, overview, coverage] = await Promise.all([
    getRegionStats(),
    getNetworkOverview(),
    getMapCoverage(),
  ]);
  const m = overview.medians;

  return (
    <div className="space-y-5">
      <div className="grid gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-2 xl:grid-cols-5 *:bg-card *:p-5">
        <Stat
          label="Network median tuition"
          value={fmt.currency(m.tuition)}
          hint={`Across ${overview.schools} schools`}
        />
        <Stat
          label="Network median teacher salary"
          value={fmt.currency(m.teacherSalary)}
          hint="Average salary per school"
        />
        <Stat
          label="Network median retention"
          value={fmt.percent(m.retention)}
          hint="Teachers returning year over year"
        />
        <Stat
          label="Schools on the map"
          value={`${coverage.mapped} of ${coverage.total}`}
          hint={`${coverage.exact} at an exact address`}
        />
        <Stat
          label="Schools with a lunch program"
          value={fmt.percent(m.lunchProgramShare)}
          hint={`${fmt.number(overview.students)} students in total`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="border-b">
            <CardTitle>Regions compared</CardTitle>
            <CardDescription>
              Median per region. The vertical line marks the network median.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <RegionChart data={regions} network={m} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Membership by region</CardTitle>
            <CardDescription>
              Share of schools in each region by membership status.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <MembershipByRegion data={regions} />
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Region</TableHead>
              <TableHead className="text-right">Schools</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Students
              </TableHead>
              <TableHead className="text-right">Tuition</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Teacher salary
              </TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Retention
              </TableHead>
              <TableHead className="hidden pr-4 text-right lg:table-cell">
                Lunch program
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular">
            {regions.map((r) => (
              <TableRow key={r.region}>
                <TableCell className="pl-4 font-medium">
                  {REGION_LABELS[r.region]}
                </TableCell>
                <TableCell className="text-right">{r.schools}</TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  {fmt.number(r.students)}
                </TableCell>
                <TableCell className="text-right">
                  {fmt.currency(r.medianTuition)}
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  {fmt.currency(r.medianTeacherSalary)}
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  {fmt.percent(r.medianRetention)}
                </TableCell>
                <TableCell className="hidden pr-4 text-right lg:table-cell">
                  {fmt.percent(r.lunchProgramShare)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
