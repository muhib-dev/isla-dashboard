# ISLA Dashboard — screen design spec (v1.0)

Source: "ISLA Design System" + "ISLA Screens" mockups. Tokens live in
`src/app/globals.css` (copy of `docs/design/isla-tokens.css`). Tone: enterprise, trustworthy, calm.

## Global rules

- **Font**: Poppins only; weights 400 body / 500 UI labels & emphasis / 600 headings. Never 700+ (`font-bold` is banned → `font-semibold`).
- **Root is 17px** (`html { font-size: 106.25% }`), so `text-sm` ≈ 15px, `text-xs` ≈ 13px. Design type scale is in px and
  available as utilities: `text-display` 40/48, `text-h1` 30/38, `text-h2` 24/32, `text-h3` 20/28 (card titles),
  `text-h4` 17/24, `text-body-lg` 19/30, `text-body-sm` 15/22, `text-caption` 13/18 (floor size), `text-overline`.
  Use `text-[15px]` / `text-[13px]` when matching mockups exactly.
- **Numbers**: tabular figures are on globally. Right-align numbers in tables. IDs = Poppins 500 (no monospace look).
- **Layout**: content is full width (no max-width container). Page padding comes from `PageBody` (32 / 24 / 16px). Grid gutter 16px (`gap-4`); card padding 20–24px.
- **Radius**: `rounded-sm` 4 (badge, checkbox), `rounded-md` 6 (button, input, menu item, small tiles), `rounded-lg` 8 (card, table wrapper, popover), `rounded-xl` 12 (dialog). Avatars/dots `rounded-full`. People round, schools square (6px tile with initials).
- **Surfaces**: cards = `rounded-lg border bg-card` — flat, no shadow. Shadows only on overlays (`shadow-md` popover, `shadow-lg` dialog/sheet/toast). Table header row + subtle panels = `bg-surface-2`. Hover rows = `hover:bg-surface-2`.
- **Color use**: navy (`action`/`primary`/`chart-1`) only for primary actions, active nav and key data. Everything else neutral. Semantic colors are muted and ALWAYS paired with an icon or label.
  - Text/links: `text-link` for inline links ("View all", "Remind"). `text-muted-foreground` for secondary.
  - Semantic: `text-success|warning|destructive|info`, tinted bg `bg-*-subtle`. Alerts = `border border-[color-mix(in_oklch,var(--destructive)_25%,var(--border))] bg-destructive-subtle` with a 20px icon in the solid color, bold first sentence + muted second.
  - Gold: `bg-highlight text-highlight-foreground` for "Featured"; `bg-highlight-subtle` for promo panels.
  - Membership: `bg-member-active|grace|lapsed`, none = hollow ring `border-[1.5px] border-member-none`. Use `MembershipStatusDot` from `@/components/shared/status`.
- **Badges**: `<Badge variant="success|warning|destructive|info|highlight|secondary|outline">` — 24px tall, 4px radius, 13px 500.
- **Buttons**: primary = default variant; secondary actions = `outline`; tertiary = `ghost`. Page header: outline "Export"-type left, primary right. Icon-only buttons need `aria-label` + tooltip.
- **Tables**: use `@/components/ui/table` (already restyled: surface-2 header 44px, 13px 600 muted headers, 52px rows, 15px cells). Wrap in `rounded-lg border bg-card overflow-hidden`. Toolbar row above header: search input (36px, w-280) + dashed-border filter buttons (`border-dashed`), "Reset" ghost, "View" outline right. Footer row: "Showing 1–12 of 99" muted left, pagination right. Selected rows: `bg-[color-mix(in_oklch,var(--info-subtle)_70%,var(--card))]` + bulk bar `bg-info-subtle`.
- **Tabs (underline style)**: row with `border-b`, items `py-2.5`, 15px 500, active `border-b-2 border-primary text-foreground`, inactive muted; count chip `rounded-sm bg-secondary px-1.5 text-[13px] text-muted-foreground`.
- **Segmented control**: `rounded-lg border bg-muted p-[3px]`, active segment `rounded-md border bg-card shadow-xs`.
- **KPI tiles**: use `KpiTile`, `KpiGrid`, `Sparkline`, `MedianBar` from `@/components/shared/kpi-tile`. Delta color follows meaning (good = green even if down). Label 15px muted 500, value `text-h1` 600, footer 13px muted with top border.
- **Charts**: your school / ISLA = `--chart-1` solid (line 2.25px, area 7% fill). Peer median / benchmark = `--chart-median` dashed `5 4`, 1.75px, never a brand color; middle-50% band = chart-median at 12% opacity. Grid: horizontal only, `--chart-grid`; axis labels 12–13px `--chart-axis`; no axis lines. Legend top-right, inline, 13px 500 muted. Bars: 3px top radius, start at zero. Tooltip: popover surface, `shadow-md`, value in 600, delta vs median stated in words ("34% above median"). Categorical series: chart-1…8 in order.
- **Empty states**: 56px square `rounded-lg border bg-surface-2` icon tile (28px icon, stroke 1.5), 600 title, muted one-line hint, outline button.
- **Section/card headers**: card title `text-h3 font-semibold` (20/28), optional muted 15px subtitle below; action (link or small outline button) on the right. List cards: header row `px-6 py-4 border-b`, rows `px-6 py-3 border-b`.
- **Icons**: lucide, sizes 16 (table, badges, small buttons) / 18 (nav, md buttons, inputs) / 20 (top bar, alerts).

## Screens (from the "ISLA Screens" mockup, 1440×960)

### 01 Home — ISLA staff
1. Page header: `Good morning, {first name}` (h1) + muted line "Thursday 15 October · 38 schools are in their grace period". Actions: outline Export, primary "Add school".
2. KPI row (4 tiles, sparkline each): Member schools · Renewal rate · Revenue year to date · Overdue invoices (delta red, arrow up = bad). Footer text 13px e.g. "Active + grace + lapsed · 12 joined this year".
3. Row (2fr / 1fr): **Membership by region** card — title + "N schools · as of today", legend (Active/Grace/Lapsed/Not a member squares) top-right; one row per region: name (130px) · stacked horizontal bar 16px tall in member colors, 2px gaps, 3px end radius, bar width ∝ total · total right-aligned 500. **Quick actions** card — 4 rows: 36px `bg-surface-2 text-primary` icon tile, 15px 500 label, 13px muted sub, chevron right; row = `rounded-md border p-3 hover:bg-accent`.
4. Row (1fr / 1fr): **Recent activity** list — 32px round `bg-surface-2` icon in semantic color, "**School** did thing", 13px muted time; header "View all" link. **Grace period ending soon** — rows: name + country (13px muted), days left (destructive if ≤7 else warning, 500), amount right, "Remind" link; header button outline sm "Remind all" with mail icon.

### 01b Home — school admin
Same shell: greeting header, KPI tiles about their school (enrolment, membership status, open jobs, profile freshness), alert banner if invoice overdue / grace period, cards for jobs, offers, profile health. Reuse the components above.

### 02 Schools — ISLA staff
Header "Schools" + "Every member and prospective school in the ISLA network." Actions: outline Export, primary Add school. Underline tabs with counts: All 573 · Active · Grace period · Lapsed · Not a member. Table card: toolbar (search "Search by name, city or ID", dashed filter chips Region / Curriculum / Renewal date with selected-value chip, Reset, View); bulk bar when rows selected ("2 selected" · primary sm "Send renewal reminder" · outline "Change status" · outline "Export" · "Clear selection" link right). Columns: checkbox · School (32px square initials tile + name 500 + city 13px muted) · ID (14px 500 muted) · Region · Curriculum (muted) · Status (member dot) · Students (right) · Renewal (warning/destructive 500 when grace/lapsed, else muted) · ⋯ menu. Footer: "Showing 1–12 of 99 · filtered from 573", rows-per-page select, pagination.

### 03 Analytics — school admin
Header "Analytics" + "Compared with 46 peer schools · Europe · 800–1,500 students". Actions: segmented Term/Year/5 years, outline "Edit peer group" (users icon), outline Export.
KPI tiles ×4 with info icon: value + delta, `MedianBar` (navy fill, median tick), footer "Peer median X" left / "12% above" (500 foreground) right. Lower-is-better metrics: delta red when worse.
Row (1.6fr / 1fr): **Enrolment** line chart (school solid navy + area, median dashed, middle-50% band, hover tooltip) + legend; **Staff turnover** grouped bars (school chart-1, median chart-8 @55%) "lower is better".
**Benchmark detail** table card: header with "View as table" link; columns Metric · Your school (right, 500) · Peer median (right, muted) · Percentile among peers (6px track, median tick at 50%, 14px navy dot with card ring at percentile, "68th" right).
ISLA staff analytics: same visual language for region overview.

### 04 Billing — school admin
Header "Billing" + "Invoices and payments for {school}." Actions: outline "Payment methods" (card icon), primary "Pay $X".
Destructive alert when overdue: "1 invoice is overdue." + muted detail + small solid destructive "Pay now".
4 stat tiles: Outstanding (value + "3 invoices · $3,200.00 overdue"), Paid in 2026, Next renewal (date + tier), Default payment (VISA chip 40×28 + •••• 4242, "Expires 08/28").
Invoices table card: underline tabs inside card header (All invoices · Unpaid · 3 · Paid) + search 240px + date-range outline button right. Columns: Invoice (14px 500) · Description (truncate) · Issued (muted) · Due (muted, sorted ↓) · Amount (right, 500) · Status badge (success Paid / warning "Due in 3 days" / destructive "Overdue · 44 days") · actions (primary sm "Pay" when unpaid + ghost download icon). Footer: "7 invoices" left, "Questions about an invoice? Contact ISLA accounts" link right.
ISLA staff billing: same tiles/table language across all schools.

### 05 Jobs — school admin
Header "Jobs" + "Vacancies posted to the ISLA careers board. Posts stay live for 60 days." Primary "New job" opens a right **sheet** (600px, popover bg, header title + muted sub + close; footer: ghost Cancel left, outline "Save draft", primary "Publish job").
4 simple stat tiles: Live posts · Applicants (30 days) · Applicants per post (+ "median 22" muted 15px) · Featured credits.
Table card: toolbar (search, dashed Status / Type). Columns: Role (title 500 + optional gold "Featured" badge with star + dept 13px muted) · Type (muted) · Applicants (right 500) · Views (right muted) · Expires (warning 500 when soon) · Status dot (Live success, Draft hollow, Expired muted) · ⋯. Row 56px.
Form fields: label 15px 500, required `*` destructive, helper 13px muted, error 13px destructive 500 with alert icon.

### 06 Map — staff/public
Full-bleed split: 400px left list panel (`bg-card border-r`): h1 "Map" (text-h2) + count right, search 40px, status filter chips (32px, `rounded-md border`, active = `border-primary bg-[color-mix(in_oklch,var(--primary)_8%,var(--card))]`, dot + label). List rows: 36px square initials tile, name 15px 500, "City · N students" 13px muted, status dot line; selected row `bg-[color-mix(in_oklch,var(--primary)_6%,var(--card))]` + `shadow-[inset_3px_0_0_var(--primary)]`. Map right: zoom buttons top-right (40px stacked, card bg, border, shadow-sm), legend bottom-left (Cluster navy circle + status dots), selected-school popover card bottom-right (320px, shadow-md: initials tile, name 600, city, close; Status/Students grid; outline "Directions" + primary "Open profile"). Clusters: navy circle with 5px 22% halo, white 600 count. Pins: member color with card-colored 2px border.
