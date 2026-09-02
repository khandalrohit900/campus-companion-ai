import type { UIMessage } from "ai";

const KEY = "campusmate.chat.v1";

export function loadChat(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChat(messages: UIMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    /* storage unavailable */
  }
}

export function clearChat() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
