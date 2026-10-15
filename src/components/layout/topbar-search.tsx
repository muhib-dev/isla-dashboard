"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navSections } from "./nav-main";

export type SearchItem = {
  group: string;
  label: string;
  sub?: string;
  href: string;
};

/** Topbar search field that opens a ⌘K palette over pages and the viewer's records. */
export function TopbarSearch({
  role,
  items,
  placeholder,
}: {
  role: "school" | "isla";
  items: SearchItem[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const groups = Map.groupBy(items, (i) => i.group);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center gap-2 rounded-md text-[15px] text-muted-foreground transition-colors hover:text-foreground md:w-70 md:justify-start md:border md:border-input md:bg-card md:px-2.5 md:hover:bg-surface-2"
        aria-label={placeholder}
      >
        <SearchIcon className="size-5 md:size-4" aria-hidden />
        <span className="hidden flex-1 truncate text-left md:block">
          {placeholder}
        </span>
        <kbd className="hidden rounded-sm border px-1.5 font-sans text-xs md:block">
          ⌘K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description={placeholder}
      >
        {/* Substring match: cmdk's fuzzy default ranks "Analytics" first for "nasr". */}
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Pages">
              {navSections(role).flatMap((section) =>
                section.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`page ${item.title} ${section.label}`}
                    onSelect={() => go(item.href)}
                  >
                    <item.icon />
                    {item.title}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {section.label}
                    </span>
                  </CommandItem>
                )),
              )}
            </CommandGroup>
            {[...groups].map(([group, list]) => (
              <CommandGroup key={group} heading={group}>
                {list.map((item) => (
                  <CommandItem
                    key={`${group}-${item.href}-${item.label}`}
                    value={`${group} ${item.label} ${item.sub ?? ""}`}
                    onSelect={() => go(item.href)}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.sub && (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.sub}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
