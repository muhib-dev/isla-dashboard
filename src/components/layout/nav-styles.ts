// Shared look for every sidebar section and link, so the store/site links match.
export const navGroupClass = "px-3 py-1.5 group-data-[collapsible=icon]:px-2";
export const navLabelClass =
  "mb-1 h-7 px-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
// Active item: tinted surface + 3px navy bar on the leading edge.
export const navButtonClass =
  "gap-2.5 px-2.5 text-[15px] font-medium text-sidebar-foreground transition-colors [&>svg]:text-sidebar-foreground/75 hover:bg-[color-mix(in_oklch,var(--sidebar-accent)_60%,transparent)] hover:text-foreground data-active:shadow-[inset_3px_0_0_var(--sidebar-primary)] data-active:[&>svg]:text-sidebar-accent-foreground hover:[&>svg]:text-foreground";
