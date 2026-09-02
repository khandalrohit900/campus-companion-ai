import { useSyncExternalStore } from "react";

export type Topic = { name: string; done: boolean };

export type Subject = {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
};

export type Task = {
  id: string;
  title: string;
  subject: string;
  due: string; // ISO date
  priority: "high" | "medium" | "low";
  kind: "study" | "assignment";
  done: boolean;
};

export type PlanDay = {
  day: number;
  date: string;
  focus: string;
  tasks: string[];
};

export type StudyPlan = {
  subject: string;
  examDate: string;
  createdAt: string;
  days: PlanDay[];
};

export type StudyLogEntry = { date: string; minutes: number };

export type CampusState = {
  studentName: string;
  subjects: Subject[];
  tasks: Task[];
  plan: StudyPlan | null;
  studyLog: StudyLogEntry[];
};

const KEY = "campusmate.v1";

const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const daysUntil = (iso: string) => {
  const diff = new Date(iso + "T00:00:00").getTime() - new Date(todayISO() + "T00:00:00").getTime();
  return Math.round(diff / 86400000);
};

export const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

function seedState(): CampusState {
  return {
    studentName: "Student",
    subjects: [
      {
        id: uid(),
        name: "DBMS",
        color: "chart-1",
        topics: [
          { name: "ER Model", done: true },
          { name: "Relational Algebra", done: true },
          { name: "Normalization", done: false },
          { name: "SQL Queries", done: true },
          { name: "Transactions", done: false },
          { name: "Indexing", done: false },
        ],
      },
      {
        id: uid(),
        name: "Python",
        color: "chart-2",
        topics: [
          { name: "Variables & Data Types", done: true },
          { name: "Loops & Conditions", done: true },
          { name: "Functions", done: false },
          { name: "Lists & Dictionaries", done: false },
          { name: "OOP Basics", done: false },
        ],
      },
      {
        id: uid(),
        name: "Mathematics",
        color: "chart-3",
        topics: [
          { name: "Limits", done: true },
          { name: "Differentiation", done: true },
          { name: "Integration", done: true },
          { name: "Matrices", done: false },
        ],
      },
      {
        id: uid(),
        name: "Computer Fundamentals",
        color: "chart-4",
        topics: [
          { name: "Number Systems", done: true },
          { name: "Operating Systems Basics", done: false },
          { name: "Networking Basics", done: false },
        ],
      },
    ],
    tasks: [
      {
        id: uid(),
        title: "Revise Normalization (1NF - 3NF)",
        subject: "DBMS",
        due: todayISO(),
        priority: "high",
        kind: "study",
        done: false,
      },
      {
        id: uid(),
        title: "Python practice: 10 loop problems",
        subject: "Python",
        due: todayISO(),
        priority: "medium",
        kind: "study",
        done: false,
      },
      {
        id: uid(),
        title: "DBMS Assignment 2 submission",
        subject: "DBMS",
        due: addDaysISO(3),
        priority: "high",
        kind: "assignment",
        done: false,
      },
      {
        id: uid(),
        title: "Python Lab record writing",
        subject: "Python",
        due: addDaysISO(5),
        priority: "medium",
        kind: "assignment",
        done: false,
      },
      {
        id: uid(),
        title: "Maths tutorial sheet 4",
        subject: "Mathematics",
        due: addDaysISO(7),
        priority: "low",
        kind: "assignment",
        done: true,
      },
    ],
    plan: null,
    studyLog: Array.from({ length: 7 }, (_, i) => ({
      date: addDaysISO(i - 6),
      minutes: [45, 90, 60, 0, 120, 75, 30][i],
    })),
  };
}

let state: CampusState = seedState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.add;
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CampusState>;
      state = { ...seedState(), ...parsed };
    } else {
      persist();
    }
  } catch {
    /* ignore corrupt storage */
  }
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(updater: (prev: CampusState) => CampusState) {
  state = updater(state);
  persist();
  emit();
}

export function useCampus() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export const actions = {
  setName(studentName: string) {
    set((s) => ({ ...s, studentName }));
  },
  toggleTask(id: string) {
    set((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  },
  addTask(task: Omit<Task, "id" | "done">) {
    set((s) => ({ ...s, tasks: [{ ...task, id: uid(), done: false }, ...s.tasks] }));
  },
  removeTask(id: string) {
    set((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  toggleTopic(subjectId: string, topicName: string) {
    set((s) => ({
      ...s,
      subjects: s.subjects.map((sub) =>
        sub.id === subjectId
          ? {
              ...sub,
              topics: sub.topics.map((t) =>
                t.name === topicName ? { ...t, done: !t.done } : t,
              ),
            }
          : sub,
      ),
    }));
  },
  addSubject(name: string) {
    set((s) => ({
      ...s,
      subjects: [
        ...s.subjects,
        { id: uid(), name, color: `chart-${(s.subjects.length % 5) + 1}`, topics: [] },
      ],
    }));
  },
  addTopic(subjectId: string, name: string) {
    set((s) => ({
      ...s,
      subjects: s.subjects.map((sub) =>
        sub.id === subjectId ? { ...sub, topics: [...sub.topics, { name, done: false }] } : sub,
      ),
    }));
  },
  logStudy(minutes: number) {
    set((s) => {
      const date = todayISO();
      const existing = s.studyLog.find((e) => e.date === date);
      return {
        ...s,
        studyLog: existing
          ? s.studyLog.map((e) => (e.date === date ? { ...e, minutes: e.minutes + minutes } : e))
          : [...s.studyLog, { date, minutes }],
      };
    });
  },
  savePlan(plan: StudyPlan) {
    set((s) => {
      const today = todayISO();
      const todaysDay = plan.days.find((d) => d.date === today) ?? plan.days[0];
      const generated: Task[] = (todaysDay?.tasks ?? []).map((title) => ({
        id: uid(),
        title,
        subject: plan.subject,
        due: todaysDay?.date ?? today,
        priority: "high" as const,
        kind: "study" as const,
        done: false,
      }));
      return { ...s, plan, tasks: [...generated, ...s.tasks] };
    });
  },
  clearPlan() {
    set((s) => ({ ...s, plan: null }));
  },
};

export function subjectProgress(subject: Subject) {
  if (subject.topics.length === 0) return 0;
  return Math.round((subject.topics.filter((t) => t.done).length / subject.topics.length) * 100);
}
