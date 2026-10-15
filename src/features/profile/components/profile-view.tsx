import { CheckIcon, MinusIcon } from "lucide-react";
import { FreshnessDot } from "@/components/shared/status";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  gradeSpan,
  SECTION_LABELS,
  sectionValues,
} from "@/features/schools/lib";
import {
  PROFILE_SECTIONS,
  REGION_LABELS,
  type Freshness,
  type ProfileSection,
  type School,
} from "@/features/schools/schema";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmSectionButton, EditSectionSheet } from "./edit-section-sheet";

type Health = {
  score: number;
  freshness: Record<ProfileSection, Freshness>;
};

export function ProfileView({
  school,
  health,
  initialSection = "overview",
}: {
  school: School;
  health: Health;
  initialSection?: ProfileSection;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-lg border bg-card px-5 py-4">
        <p className="text-[15px] font-medium whitespace-nowrap">
          Profile {health.score}% complete
        </p>
        <Progress value={health.score} className="h-1.5 max-w-xs" />
        <p className="ml-auto hidden text-[13px] text-muted-foreground sm:block">
          Last updated {fmt.date(school.updatedAt)}
        </p>
      </div>

      <Tabs defaultValue={initialSection}>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList
            variant="line"
            className="w-full justify-start border-b pb-1.25"
          >
            {PROFILE_SECTIONS.map((section) => (
              <TabsTrigger
                key={section}
                value={section}
                className="flex-none px-2.5 py-2.5 text-[15px] after:bg-primary"
              >
                {SECTION_LABELS[section]}
                {health.freshness[section] === "stale" && (
                  <span
                    className="size-1.5 rounded-full bg-destructive"
                    aria-label="out of date"
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {PROFILE_SECTIONS.map((section) => (
          <TabsContent key={section} value={section} className="pt-4">
            <SectionCard
              school={school}
              section={section}
              freshness={health.freshness[section]}
            >
              <SectionBody school={school} section={section} />
            </SectionCard>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SectionCard({
  school,
  section,
  freshness,
  children,
}: {
  school: School;
  section: ProfileSection;
  freshness: Freshness;
  children: React.ReactNode;
}) {
  const values = sectionValues(school, section);
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-6 py-4">
        <CardTitle>{SECTION_LABELS[section]}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <FreshnessDot freshness={freshness} />
          <span>Verified {fmt.date(school.verifiedAt[section])}</span>
        </CardDescription>
        <CardAction className="flex gap-2">
          {freshness !== "fresh" && (
            <ConfirmSectionButton
              schoolId={school.id}
              section={section}
              current={values}
            />
          )}
          <EditSectionSheet
            schoolId={school.id}
            section={section}
            initial={values}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="px-6 py-5">{children}</CardContent>
    </Card>
  );
}

function SectionBody({
  school,
  section,
}: {
  school: School;
  section: ProfileSection;
}) {
  switch (section) {
    case "overview": {
      const m = school.metrics;
      return (
        <Details
          items={[
            ["Grades", gradeSpan(school.gradesFrom, school.gradesTo)],
            ["Enrollment", fmt.number(m.enrollment)],
            ["Full-time teachers", fmt.number(m.teachers)],
            [
              "Students per teacher",
              m.teachers ? fmt.ratio(m.enrollment / m.teachers) : null,
            ],
            ["Annual tuition", m.tuition ? fmt.currency(m.tuition) : null],
            ["Founded", String(school.founded)],
            ["Accreditation", school.accreditation.join(", ") || null],
            ["Region", REGION_LABELS[school.region]],
          ]}
        />
      );
    }
    case "leadership":
      return (
        <ul className="-my-2 divide-y">
          {school.leadership.map((leader) => (
            <li
              key={leader.id}
              className="grid gap-1 py-3 text-[15px] sm:grid-cols-[12rem_1fr_auto] sm:items-center sm:gap-4"
            >
              <span className="text-muted-foreground">{leader.role}</span>
              <span
                className={cn(
                  "font-medium",
                  !leader.name && "font-normal text-muted-foreground italic",
                )}
              >
                {leader.name || "Not filled in"}
              </span>
              <span className="text-muted-foreground">
                {leader.email}
                {leader.since && (
                  <span className="ml-3 tabular">since {leader.since}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      );
    case "schedule": {
      const s = school.schedule;
      return (
        <Details
          items={[
            [
              "School hours",
              `${fmt.time(s.startTime)} – ${fmt.time(s.endTime)}`,
            ],
            [
              "School year",
              s.firstDay && s.lastDay
                ? `${fmt.date(s.firstDay)} – ${fmt.date(s.lastDay)}`
                : "Not listed",
            ],
            [
              "Friday early release",
              <YesNo key="f" value={s.fridayEarlyRelease} />,
            ],
            ["Note for families", s.note || null],
          ]}
        />
      );
    }
    case "programs": {
      const p = school.programs;
      return (
        <Details
          items={[
            [
              "Lunch program",
              p.lunch.offered ? (
                [
                  p.lunch.provider || "Provider not set",
                  p.lunch.allHalal && "All halal",
                  p.lunch.freeReducedAvailable && "Free/reduced available",
                ]
                  .filter(Boolean)
                  .join(" · ")
              ) : (
                <YesNo key="l" value={false} />
              ),
            ],
            ["Quran", <YesNo key="q" value={p.quran} />],
            ["Arabic", <YesNo key="a" value={p.arabic} />],
            ["After-care", <YesNo key="c" value={p.afterCare} />],
            ["Transportation", <YesNo key="t" value={p.transportation} />],
            ["Athletics", p.athletics.join(", ") || null],
          ]}
        />
      );
    }
    case "contacts":
      return (
        <Details
          items={[
            ["Phone", school.phone],
            ["Office email", school.email],
            ["Website", school.website.replace(/^https?:\/\//, "")],
            [
              "Address",
              `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.postalCode}`,
            ],
          ]}
        />
      );
  }
}

function Details({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
          <dd
            className={cn(
              "text-[15px]",
              value == null && "text-muted-foreground italic",
            )}
          >
            {value ?? "Not filled in"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1">
      <CheckIcon className="size-3.5 text-success" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <MinusIcon className="size-3.5" /> No
    </span>
  );
}
