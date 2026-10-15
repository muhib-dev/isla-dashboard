"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLinkIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  NavigationIcon,
  PhoneIcon,
} from "lucide-react";
import { FreshnessDot, MembershipStatusDot } from "@/components/shared/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSchoolDetailsAction,
  type SchoolDetails,
} from "@/features/schools/detail-actions";
import { gradeSpan, studentsLabel, tuitionLabel } from "@/features/schools/lib";
import {
  FEATURE_LABELS,
  REGION_LABELS,
  SCHOOL_TYPE_LABELS,
} from "@/features/schools/schema";
import type { ResultRow } from "@/features/schools/search";
import { fmt } from "@/lib/format";
import { SchoolTile } from "./school-tile";
import { ContactSchoolForm } from "./submission-forms";

const SOCIAL = {
  facebook: ["Facebook", "https://facebook.com/"],
  instagram: ["Instagram", "https://instagram.com/"],
  youtube: ["YouTube", "https://youtube.com/@"],
  x: ["X", "https://x.com/"],
} as const;

/** "08:15" → "8:15 AM"; anything else is shown as-is. */
function clock(hhmm: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

const socialHref = (base: string, value: string) =>
  /^https?:\/\//.test(value) ? value : base + value.replace(/^@/, "");

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-medium">{children}</dd>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  children,
}: {
  icon: typeof PhoneIcon;
  children: React.ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-start gap-2.5 text-[15px]">
      <Icon className="mt-[3px] size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

const linkClass = "text-link underline-offset-4 hover:underline";

/** Full school details over the map, so viewers never leave it. Extra fields load on open. */
export function SchoolDetailDialog({
  row,
  unit,
  audience = "staff",
  onClose,
}: {
  row: ResultRow | null;
  unit: "mi" | "km";
  audience?: "staff" | "public";
  onClose: () => void;
}) {
  const doc = row?.doc;
  const staff = audience === "staff";
  const [loaded, setLoaded] = useState<{
    id: string;
    details: SchoolDetails | null;
  } | null>(null);
  // Keyed by school so the form starts closed for each newly opened school.
  const [contactFor, setContactFor] = useState<string | null>(null);

  const id = doc?.id;
  useEffect(() => {
    if (!id) return;
    let live = true;
    getSchoolDetailsAction(id).then(
      (details) => live && setLoaded({ id, details }),
      () => live && setLoaded({ id, details: null }),
    );
    return () => {
      live = false;
    };
  }, [id]);

  const details = loaded && loaded.id === id ? loaded.details : undefined;
  const contactOpen = !!id && contactFor === id;
  const loading = details === undefined;

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-4rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {doc && (
          <>
            <header className="flex items-start gap-4 border-b px-6 pt-6 pb-5 pr-12">
              <SchoolTile
                name={doc.name}
                className="size-12 text-[15px] text-muted-foreground"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <DialogTitle className="text-h3 font-semibold">
                  {doc.name}
                </DialogTitle>
                <DialogDescription className="text-[15px]">
                  {doc.city}, {doc.state}
                  {staff && ` · ${REGION_LABELS[doc.region]}`}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
                  {staff ? (
                    <MembershipStatusDot status={doc.membership.status} />
                  ) : (
                    doc.membership.status === "active" && (
                      <Badge variant="secondary">ISLA member</Badge>
                    )
                  )}
                  {staff && <FreshnessDot freshness={doc.freshness} />}
                </div>
              </div>
            </header>

            <div className="flex flex-wrap gap-2 border-b px-6 py-3">
              {doc.lat !== null && doc.lng !== null && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${doc.lat}%2C${doc.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <NavigationIcon /> Directions
                  </a>
                </Button>
              )}
              {details?.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${details.phone.replace(/[^\d+]/g, "")}`}>
                    <PhoneIcon /> Call
                  </a>
                </Button>
              )}
              {details?.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={details.website} target="_blank" rel="noreferrer">
                    <GlobeIcon /> Website
                  </a>
                </Button>
              )}
              {staff ? (
                <Button size="sm" className="ml-auto" asChild>
                  <Link href={`/schools/${doc.id}`}>
                    Full profile <ExternalLinkIcon />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => setContactFor(contactOpen ? null : doc.id)}
                  aria-expanded={contactOpen}
                >
                  <MailIcon /> Message school
                </Button>
              )}
            </div>

            <div className="space-y-6 px-6 py-5">
              {!staff && contactOpen && (
                <div className="rounded-lg border bg-surface-2 p-4">
                  <ContactSchoolForm schoolId={doc.id} schoolName={doc.name} />
                </div>
              )}

              <Section title="At a glance">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Fact label="Type">{SCHOOL_TYPE_LABELS[doc.schoolType]}</Fact>
                  <Fact label="Grades">
                    {gradeSpan(doc.gradesFrom, doc.gradesTo)}
                  </Fact>
                  <Fact label="Students">
                    <span className="tabular">
                      {studentsLabel(doc.enrollmentExact, doc.enrollmentBand)}
                    </span>
                  </Fact>
                  <Fact label="Tuition">
                    <span className="tabular">
                      {tuitionLabel(doc.tuition, doc.tuitionMax)}
                    </span>
                  </Fact>
                  <Fact label="Founded">
                    <span className="tabular">{doc.founded || "—"}</span>
                  </Fact>
                  <Fact label="Accreditation">
                    {doc.accreditation.length
                      ? doc.accreditation.join(", ")
                      : "None listed"}
                  </Fact>
                  {staff && details?.memberSince && (
                    <Fact label="Member since">
                      <span className="tabular">{details.memberSince}</span>
                    </Fact>
                  )}
                  {staff && doc.teachers !== null && doc.teachers > 0 && (
                    <Fact label="Teachers">
                      <span className="tabular">{doc.teachers}</span>
                    </Fact>
                  )}
                </dl>
              </Section>

              <div className="grid gap-6 sm:grid-cols-2">
                <Section title="Contact">
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-5 w-3/5" />
                      <Skeleton className="h-5 w-2/3" />
                    </div>
                  ) : details ? (
                    <ul className="space-y-2">
                      <ContactLine icon={MapPinIcon}>
                        {details.address.street && (
                          <>
                            {details.address.street}
                            <br />
                          </>
                        )}
                        {details.address.city}, {details.address.state}{" "}
                        {details.address.postalCode}
                      </ContactLine>
                      {details.phone && (
                        <ContactLine icon={PhoneIcon}>
                          <a
                            href={`tel:${details.phone.replace(/[^\d+]/g, "")}`}
                            className={linkClass}
                          >
                            {details.phone}
                          </a>
                        </ContactLine>
                      )}
                      {details.email && (
                        <ContactLine icon={MailIcon}>
                          <a href={`mailto:${details.email}`} className={linkClass}>
                            {details.email}
                          </a>
                        </ContactLine>
                      )}
                      {details.website && (
                        <ContactLine icon={GlobeIcon}>
                          <a
                            href={details.website}
                            target="_blank"
                            rel="noreferrer"
                            className={linkClass}
                          >
                            {details.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                          </a>
                        </ContactLine>
                      )}
                      {(Object.keys(SOCIAL) as (keyof typeof SOCIAL)[])
                        .filter((k) => details.social[k])
                        .map((k) => (
                          <ContactLine key={k} icon={ExternalLinkIcon}>
                            <a
                              href={socialHref(SOCIAL[k][1], details.social[k]!)}
                              target="_blank"
                              rel="noreferrer"
                              className={linkClass}
                            >
                              {SOCIAL[k][0]} · {details.social[k]}
                            </a>
                          </ContactLine>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-[15px] text-muted-foreground">
                      Contact details aren&apos;t available right now.
                    </p>
                  )}
                </Section>

                <Section title={staff ? "Leadership" : "Schedule"}>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-1/2" />
                    </div>
                  ) : staff ? (
                    details?.leaders?.length ? (
                      <ul className="space-y-2.5">
                        {details.leaders.map((l) => (
                          <li key={`${l.role}-${l.name}`} className="text-[15px]">
                            <span className="block font-medium">{l.name}</span>
                            <span className="block text-[13px] text-muted-foreground">
                              {l.role}
                              {l.email && (
                                <>
                                  {" · "}
                                  <a href={`mailto:${l.email}`} className={linkClass}>
                                    {l.email}
                                  </a>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[15px] text-muted-foreground">
                        No leaders listed.
                      </p>
                    )
                  ) : (
                    <ScheduleFacts details={details} />
                  )}
                </Section>
              </div>

              {staff && (
                <Section title="Schedule">
                  {loading ? (
                    <Skeleton className="h-5 w-2/3" />
                  ) : (
                    <ScheduleFacts details={details} />
                  )}
                </Section>
              )}

              <Section title="Programs & features">
                {loading ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ) : (
                  <ProgramBadges details={details} features={doc.features} />
                )}
              </Section>

              <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  {doc.lat === null
                    ? "Not on the map yet."
                    : doc.precision === "rooftop"
                      ? "Pin is at the exact address."
                      : "Pin shows an approximate (city-level) location."}
                  {row?.distance != null &&
                    ` ${row.distance.toFixed(1)} ${unit} from your search.`}
                </span>
              </p>
            </div>

            <p className="border-t px-6 py-3 text-[13px] text-muted-foreground">
              Listing or membership is not accreditation, certification or
              endorsement by ISLA.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleFacts({ details }: { details: SchoolDetails | null | undefined }) {
  const s = details?.schedule;
  if (!s || (!s.startTime && !s.firstDay))
    return (
      <p className="text-[15px] text-muted-foreground">
        The school hasn&apos;t published its schedule.
      </p>
    );
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {s.startTime && s.endTime && (
        <Fact label="School day">
          {clock(s.startTime)} – {clock(s.endTime)}
        </Fact>
      )}
      {s.firstDay && s.lastDay && (
        <Fact label="School year">
          {fmt.date(s.firstDay)} – {fmt.date(s.lastDay)}
        </Fact>
      )}
      {s.fridayEarlyRelease && <Fact label="Fridays">Early release</Fact>}
      {s.note && (
        <div className="col-span-2 text-[13px] text-muted-foreground">{s.note}</div>
      )}
    </dl>
  );
}

function ProgramBadges({
  details,
  features,
}: {
  details: SchoolDetails | null | undefined;
  features: ResultRow["doc"]["features"];
}) {
  const p = details?.programs;
  const programs = p
    ? [
        p.quran && "Qur'an",
        p.arabic && "Arabic",
        p.lunch.offered && (p.lunch.allHalal ? "Halal lunch" : "Lunch"),
        p.lunch.freeReducedAvailable && "Free / reduced lunch",
        p.transportation && "Transportation",
        p.afterCare && "After-care",
        ...p.athletics,
      ].filter((x): x is string => !!x)
    : [];
  const all = [...programs, ...features.map((f) => FEATURE_LABELS[f])];
  if (!all.length)
    return <p className="text-[15px] text-muted-foreground">None listed.</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {[...new Set(all)].map((label) => (
        <li key={label}>
          <Badge variant="secondary">{label}</Badge>
        </li>
      ))}
    </ul>
  );
}
