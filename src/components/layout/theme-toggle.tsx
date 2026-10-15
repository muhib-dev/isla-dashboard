"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const noop = () => () => {};

/** Topbar light/dark switch. Renders a stable icon until mounted to avoid a hydration mismatch. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className="size-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
