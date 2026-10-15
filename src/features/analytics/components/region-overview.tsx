import { KpiGrid, KpiTile } from "@/components/shared/kpi-tile";
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
import {
  MembershipLegend,
  RegionMembershipList,
} from "@/features/home/components/home-bits";
import { RegionChart } from "./region-chart";

export async function RegionOverview() {
  const [regions, overview, coverage] = await Promise.all([
    getRegionStats(),
    getNetworkOverview(),
    getMapCoverage(),
  ]);
  const m = overview.medians;

  return (
    <section className="space-y-4" aria-labelledby="region-overview-heading">
      <div className="space-y-0.5">
        <h2 id="region-overview-heading" className="text-h3 font-semibold">
          Across the network
        </h2>
        <p className="text-[15px] text-muted-foreground">
          {overview.schools} schools · {fmt.number(overview.students)} students
        </p>
      </div>

      <KpiGrid className="xl:grid-cols-5">
        <KpiTile
          label="Median tuition"
          value={fmt.currency(m.tuition)}
          footer={<span>Across {overview.schools} schools</span>}
        />
        <KpiTile
          label="Median teacher salary"
          value={fmt.currency(m.teacherSalary)}
          footer={<span>Average salary per school</span>}
        />
        <KpiTile
          label="Median retention"
          value={fmt.percent(m.retention)}
          footer={<span>Teachers returning year over year</span>}
        />
        <KpiTile
          label="Schools on the map"
          value={`${coverage.mapped} of ${coverage.total}`}
          footer={<span>{coverage.exact} at an exact address</span>}
        />
        <KpiTile
          label="With a lunch program"
          value={fmt.percent(m.lunchProgramShare)}
          footer={<span>{fmt.number(overview.students)} students in total</span>}
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Regions compared</CardTitle>
            <CardDescription>
              Median per region against the network median.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <RegionChart data={regions} network={m} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Membership by region</CardTitle>
            <CardDescription>
              Share of schools in each region by status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <MembershipLegend />
            <RegionMembershipList regions={regions} />
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-6 py-4 [.border-b]:pb-4">
          <CardTitle>Regions in detail</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Region</TableHead>
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
              <TableHead className="hidden pr-6 text-right lg:table-cell">
                Lunch program
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular">
            {regions.map((r) => (
              <TableRow key={r.region}>
                <TableCell className="pl-6 font-medium">
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
                <TableCell className="hidden pr-6 text-right lg:table-cell">
                  {fmt.percent(r.lunchProgramShare)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
