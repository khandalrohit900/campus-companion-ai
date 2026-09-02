import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { CAMPUSMATE_SYSTEM_PROMPT } from "@/lib/campusmate-prompt";

type ChatRequestBody = { messages?: unknown; context?: string };

const planInput = z.object({
  subject: z.string().describe("Subject the plan is for, e.g. DBMS"),
  examDate: z
    .string()
    .describe("Exam date in YYYY-MM-DD format. Estimate from the days available if not given."),
  days: z
    .array(
      z.object({
        day: z.number().describe("Day number, starting at 1"),
        date: z.string().describe("Date for this day in YYYY-MM-DD format"),
        focus: z.string().describe("Short focus/theme for the day"),
        tasks: z.array(z.string()).describe("2-4 concrete tasks for the day"),
      }),
    )
    .describe("One entry per available day, ending with a revision day"),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("AI is not configured (missing LOVABLE_API_KEY)", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const today = new Date().toISOString().slice(0, 10);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: `${CAMPUSMATE_SYSTEM_PROMPT}\n\nToday's date is ${today}.\n\nStudent's current CampusMate data:\n${body.context ?? "(no data yet)"}`,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
            stopWhen: stepCountIs(50),
            tools: {
              create_study_plan: tool({
                description:
                  "Create and save a day-by-day study plan for one subject. Saves it to the student's Planner and adds today's tasks to their dashboard.",
                inputSchema: planInput,
                execute: async (plan) => ({
                  saved: true,
                  subject: plan.subject,
                  examDate: plan.examDate,
                  totalDays: plan.days.length,
                  days: plan.days,
                }),
              }),
            },
            onError: ({ error }) => {
              console.error("CampusMate chat error", error);
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (error) {
          console.error("CampusMate chat failed", error);
          return new Response("CampusMate could not answer right now. Please try again.", {
            status: 500,
          });
        }
      },
    },
  },
});
