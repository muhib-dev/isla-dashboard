"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJob } from "@/features/jobs/actions";
import { JOB_CATEGORY_LABELS, type NewJob } from "@/features/jobs/schema";

const EMPTY: NewJob = { title: "", category: "teaching", type: "full_time" };

export function PostJobDialog({
  schoolId,
  schoolName,
}: {
  schoolId: string;
  schoolName: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<NewJob>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await postJob(schoolId, value);
      if (result.ok) {
        toast.success("Job posted to the ISLA Job Portal");
        setOpen(false);
        setValue(EMPTY);
        setErrors({});
      } else {
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Post a job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Post a job</DialogTitle>
            <DialogDescription>
              Listed on the ISLA Job Portal under {schoolName}. Location and
              contact details come from your school profile.
            </DialogDescription>
          </DialogHeader>
          <Field id="title" label="Job title" error={errors.title}>
            <Input
              id="title"
              autoFocus
              placeholder="e.g. Grade 4 Teacher"
              value={value.title}
              onChange={(e) => setValue({ ...value, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="category" label="Category">
              <Select
                value={value.category}
                onValueChange={(v) =>
                  setValue({ ...value, category: v as NewJob["category"] })
                }
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="type" label="Type">
              <Select
                value={value.type}
                onValueChange={(v) =>
                  setValue({ ...value, type: v as NewJob["type"] })
                }
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Posting…" : "Post job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
