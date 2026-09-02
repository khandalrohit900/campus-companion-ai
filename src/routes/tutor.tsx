import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { BookOpen, Code2, CalendarDays, FileText, RotateCcw, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  actions,
  daysUntil,
  subjectProgress,
  todayISO,
  useCampus,
  type StudyPlan,
} from "@/lib/campus-store";
import { clearChat, loadChat, saveChat } from "@/lib/chat-storage";

type Search = { q?: string | undefined };

export const Route = createFileRoute("/tutor")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "AI Tutor — CampusMate AI" },
      {
        name: "description",
        content:
          "Chat with CampusMate AI to understand tough topics, get a study plan, practice MCQs and structure assignments.",
      },
      { property: "og:title", content: "AI Tutor — CampusMate AI" },
      {
        property: "og:description",
        content: "Your first-year study companion: explanations, plans, quizzes and coding help.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TutorPage,
});

const quickPrompts = [
  { icon: BookOpen, label: "Explain a topic", text: "Explain DBMS normalization simply with an example" },
  {
    icon: CalendarDays,
    label: "Make a plan",
    text: "Mera DBMS exam 12 din baad hai aur mujhe kuch nahi aata. Plan bana do.",
  },
  { icon: Code2, label: "Coding help", text: "Python loops samjhao with beginner practice questions" },
  {
    icon: FileText,
    label: "Assignment help",
    text: "Help me structure a DBMS assignment on ER diagrams",
  },
];

function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function TutorPage() {
  const search = Route.useSearch();
  const state = useCampus();
  const [input, setInput] = useState("");
  const [initialMessages] = useState<UIMessage[]>(() => loadChat());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const appliedPlans = useRef(new Set<string>());
  const sentPrefill = useRef(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          const s = stateRef.current;
          const context = [
            `Student name: ${s.studentName}`,
            `Subjects: ${s.subjects
              .map((sub) => `${sub.name} (${subjectProgress(sub)}% topics done)`)
              .join(", ")}`,
            `Pending tasks: ${
              s.tasks
                .filter((t) => !t.done)
                .map((t) => `${t.title} [${t.subject}, due ${t.due}]`)
                .join("; ") || "none"
            }`,
            s.plan
              ? `Active plan: ${s.plan.subject}, exam ${s.plan.examDate} (${daysUntil(
                  s.plan.examDate,
                )} days left)`
              : "Active plan: none",
          ].join("\n");
          return { body: { messages, context } };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: "campusmate-main",
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "CampusMate could not answer. Try again."),
  });

  useEffect(() => {
    saveChat(messages);
  }, [messages]);

  // Apply study plans the agent created into the local Planner + Tasks.
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-create_study_plan" &&
          "state" in part &&
          part.state === "output-available"
        ) {
          const key = `${message.id}:${"toolCallId" in part ? part.toolCallId : ""}`;
          if (appliedPlans.current.has(key)) continue;
          appliedPlans.current.add(key);
          const output = part.output as Partial<StudyPlan> & { days?: StudyPlan["days"] };
          if (output?.subject && output.days?.length) {
            actions.savePlan({
              subject: output.subject,
              examDate: output.examDate ?? output.days[output.days.length - 1]!.date,
              createdAt: todayISO(),
              days: output.days,
            });
            toast.success(`Study plan saved for ${output.subject}`);
          }
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      void sendMessage({ text: trimmed });
      setInput("");
      inputRef.current?.focus();
    },
    [isBusy, sendMessage],
  );

  useEffect(() => {
    if (sentPrefill.current) return;
    sentPrefill.current = true;
    if (search.q) send(search.q);
  }, [search.q, send]);

  useEffect(() => {
    if (!isBusy) inputRef.current?.focus();
  }, [isBusy]);

  return (
    <AppShell title="AI Tutor" subtitle="Ask anything — explanations, plans, quizzes, code, writing">
      <div className="mx-auto flex h-[calc(100vh-9.5rem)] max-w-3xl flex-col surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> CampusMate AI
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearChat();
              setMessages([]);
              appliedPlans.current.clear();
              inputRef.current?.focus();
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New conversation
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-md py-8 text-center">
              <p className="font-display text-xl font-semibold">
                Hi {state.studentName}! What are you working on today?
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Study help, assignments, coding, planner, presentations, career or college writing —
                Hinglish bhi chalega.
              </p>
            </div>
          ) : null}

          {messages.map((message) => {
            const text = messageText(message);
            const planParts = message.parts.filter((p) => p.type === "tool-create_study_plan");
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {text}
                  </div>
                </div>
              );
            }
            return (
              <div key={message.id} className="space-y-2">
                {planParts.length > 0 ? (
                  <div className="rounded-xl border border-accent/50 bg-accent/15 px-3 py-2 text-xs font-medium text-accent-foreground">
                    🗓️ Study plan generated and saved to your Planner
                  </div>
                ) : null}
                {text ? (
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-3 text-sm text-secondary-foreground prose-chat">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                ) : null}
              </div>
            );
          })}

          {isBusy ? (
            <div className="flex items-center gap-1.5 px-1 text-muted-foreground">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
              <span className="ml-1 text-xs">CampusMate is thinking…</span>
            </div>
          ) : null}

          {error ? (
            <p className="text-xs text-destructive">
              {error.message || "Something went wrong. Please try again."}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="mb-2.5 flex flex-wrap gap-2">
            {quickPrompts.map(({ icon: Icon, label, text }) => (
              <button
                key={label}
                type="button"
                onClick={() => send(text)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Textarea
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Ask CampusMate anything…"
              className="max-h-40 min-h-[52px] resize-none"
              aria-label="Message CampusMate AI"
            />
            <Button type="submit" size="icon" disabled={isBusy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
