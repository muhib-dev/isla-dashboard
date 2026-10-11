"use client"

import { useTransition } from "react"
import { useTheme } from "next-themes"
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { switchRole } from "@/features/session/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Props = {
  role: "school" | "isla"
  user: { name: string; title: string; initials: string }
}

const ROLES = [
  { value: "school", label: "School admin", hint: "Al-Noor Academy" },
  { value: "isla", label: "ISLA staff", hint: "All schools" },
] as const

const THEMES = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const

export function UserMenu({ role, user }: Props) {
  const [pending, startTransition] = useTransition()
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 gap-2.5 px-2 data-[pending=true]:opacity-60" data-pending={pending}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand-100 text-xs font-medium text-brand-800 dark:bg-brand-900 dark:text-brand-100">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:grid">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">{user.title}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">View the prototype as</DropdownMenuLabel>
        <DropdownMenuGroup>
          {ROLES.map((r) => (
            <DropdownMenuItem
              key={r.value}
              disabled={pending}
              onSelect={() => r.value !== role && startTransition(() => switchRole(r.value))}
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
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Appearance</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 p-1">
          {THEMES.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={theme === t.value ? "secondary" : "ghost"}
              onClick={() => setTheme(t.value)}
              aria-pressed={theme === t.value}
            >
              <t.icon />
              {t.label}
            </Button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
