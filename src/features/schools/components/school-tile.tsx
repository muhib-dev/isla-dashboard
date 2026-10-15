import { cn } from "@/lib/utils";

const SKIP = new Set(["the", "of", "and", "al", "for", "school", "academy"]);

/** Up to two initials, skipping filler words ("Al-Noor Islamic Academy" → "NI"). */
export function schoolInitials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter(Boolean);
  const meaningful = words.filter((w) => !SKIP.has(w.toLowerCase()));
  const pick = (meaningful.length ? meaningful : words).slice(0, 2);
  return pick.map((w) => w[0]!.toUpperCase()).join("") || "?";
}

/** Schools are square: 6px tile with initials (people get round avatars). */
export function SchoolTile({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-md border bg-surface-2 font-semibold text-primary",
        size === "sm" ? "size-8 text-[12px]" : "size-9 text-[13px]",
        className,
      )}
    >
      {schoolInitials(name)}
    </span>
  );
}
