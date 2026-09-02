import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, daysUntil, formatDate, todayISO, useCampus, type Task } from "@/lib/campus-store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks & Assignments — CampusMate AI" },
      {
        name: "description",
        content:
          "Track study tasks and assignment deadlines with priorities, due dates and subjects in CampusMate AI.",
      },
      { property: "og:title", content: "Tasks & Assignments — CampusMate AI" },
      {
        property: "og:description",
        content: "One list for every study task and assignment deadline of your first year.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const priorityTone: Record<Task["priority"], string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/20 text-warning-foreground",
  low: "bg-success/15 text-success",
};

export function TaskRow({ task }: { task: Task }) {
  const left = daysUntil(task.due);
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => actions.toggleTask(task.id)}
        className="h-4 w-4 accent-[var(--primary)]"
        aria-label={`Mark ${task.title} complete`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${task.done ? "text-muted-foreground line-through" : ""}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{task.subject}</span>
          <span aria-hidden>•</span>
          <span>{task.kind === "assignment" ? "Assignment" : "Study"}</span>
          <span aria-hidden>•</span>
          <span>
            {formatDate(task.due)}
            {!task.done && left <= 2
              ? left < 0
                ? " (overdue)"
                : left === 0
                  ? " (today)"
                  : " (tomorrow)"
              : ""}
          </span>
        </p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${priorityTone[task.priority]}`}
      >
        {task.priority}
      </span>
      <button
        type="button"
        onClick={() => actions.removeTask(task.id)}
        aria-label={`Delete ${task.title}`}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function TasksPage() {
  const { tasks, subjects } = useCampus();
  const [form, setForm] = useState({
    title: "",
    subject: subjects[0]?.name ?? "General",
    due: todayISO(),
    priority: "medium" as Task["priority"],
    kind: "study" as Task["kind"],
  });

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <AppShell title="Tasks & Assignments" subtitle="Small steps beat one long panic session">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="surface overflow-hidden">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
              Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nothing pending. Add a task or ask the AI Tutor for a plan.
              </p>
            ) : (
              <ul>
                {pending.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            )}
          </section>

          {done.length > 0 ? (
            <section className="surface overflow-hidden">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
                Completed ({done.length})
              </h2>
              <ul>
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <form
          className="surface h-fit space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim()) return;
            actions.addTask({ ...form, title: form.title.trim() });
            setForm({ ...form, title: "" });
          }}
        >
          <h2 className="text-sm font-semibold">Add a task</h2>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Revise SQL joins"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-subject">Subject</Label>
            <select
              id="task-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              <option value="General">General</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due</Label>
              <Input
                id="task-due"
                type="date"
                value={form.due}
                onChange={(e) => setForm({ ...form, due: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-kind">Type</Label>
            <select
              id="task-kind"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as Task["kind"] })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="study">Study task</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add task
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
