"use client";

import { useTransition } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { switchRole } from "@/features/session/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

type Role = "school" | "isla";

export type Workspace = { mark: string; name: string; role: string };

const ROLES = [
  { value: "school", label: "School admin", hint: "Al-Noor Academy" },
  { value: "isla", label: "ISLA staff", hint: "Member services · all schools" },
] as const;

/** Square brand tile with the workspace initials. */
function Mark({ children }: { children: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand text-[13px] font-semibold text-brand-foreground">
      {children}
    </span>
  );
}

/** Sidebar header: the current workspace, doubling as the demo's role switcher. */
export function WorkspaceSwitcher({
  role,
  workspace,
}: {
  role: Role;
  workspace: Workspace;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="gap-2.5 data-[pending=true]:opacity-60 data-[state=open]:bg-sidebar-accent"
          data-pending={pending}
        >
          <Mark>{workspace.mark}</Mark>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-[15px] font-semibold text-foreground">
              {workspace.name}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">
              {workspace.role}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          View the prototype as
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {ROLES.map((r) => (
            <DropdownMenuItem
              key={r.value}
              disabled={pending}
              onSelect={() =>
                r.value !== role && startTransition(() => switchRole(r.value))
              }
            >
              <span className="grid flex-1 leading-tight">
                <span>{r.label}</span>
                <span className="text-sm text-muted-foreground">{r.hint}</span>
              </span>
              {r.value === role && <CheckIcon className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Prototype with sample data. Schools and people are fictional.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
