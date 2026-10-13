"use client";

import { useState } from "react";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addSaved,
  readSaved,
  writeSaved,
  type SavedSearch,
} from "@/features/schools/saved-searches";

/** Radix unmounts closed dialog content, so the body re-reads storage every time it opens. */
export function SavedSearchesDialog({
  open,
  onOpenChange,
  currentQs,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentQs: string;
  onApply: (qs: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <SavedBody
          currentQs={currentQs}
          onApply={(qs) => {
            onApply(qs);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function SavedBody({
  currentQs,
  onApply,
}: {
  currentQs: string;
  onApply: (qs: string) => void;
}) {
  const [list, setList] = useState<SavedSearch[]>(() => readSaved());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const { list: next, ok } = addSaved(name, currentQs);
    setList(next);
    setName("");
    setError(
      ok
        ? null
        : "Your browser blocked saving. The search link still works if you copy it.",
    );
  }
  function remove(id: string) {
    const next = list.filter((s) => s.id !== id);
    setList(next);
    writeSaved(next);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Saved searches</DialogTitle>
        <DialogDescription>Stored in this browser only.</DialogDescription>
      </DialogHeader>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name the current search"
          aria-label="Name this search"
          maxLength={60}
        />
        <Button type="submit" disabled={!currentQs}>
          Save
        </Button>
      </form>
      {!currentQs && (
        <p className="text-xs text-muted-foreground">
          Add a search or filter first.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved searches yet.</p>
      ) : (
        <ul className="divide-y text-sm">
          {list.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <button
                type="button"
                className="truncate text-left hover:underline"
                onClick={() => onApply(s.qs)}
              >
                {s.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${s.name}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(s.id)}
              >
                <TrashIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
