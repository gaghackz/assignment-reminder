import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export type EventType =
  | "assignment"
  | "quiz"
  | "exam"
  | "project"
  | "lab"
  | "announcement"
  | "material"
  | "class_change"
  | "attendance"
  | "other";

export interface ExtractedEvent {
  important: boolean;
  type: EventType;
  title: string;
  description: string;
  deadline: string | null;       // "YYYY-MM-DD" or null
  deadline_text: string | null;  // original wording like "Friday" or null
  needs_review: boolean;         // true if deadline was vague/ambiguous
}

export interface EmailBatchItem {
  emailId: string;
  sender: string;
  subject: string;
  body: string;
  receivedDate: string;
}

export interface BatchResult {
  emailId: string;
  events: ExtractedEvent[];
}

const TYPE_EMOJI: Record<EventType, string> = {
  assignment: "📚",
  quiz: "📝",
  exam: "🎯",
  project: "🔬",
  lab: "🧪",
  announcement: "📢",
  material: "📄",
  class_change: "🏫",
  attendance: "✅",
  other: "ℹ️",
};

export { TYPE_EMOJI };

// Send up to CHUNK_SIZE emails in a single AI call to stay within rate limits
const CHUNK_SIZE = 10;

export async function analyzeBatch(emails: EmailBatchItem[]): Promise<BatchResult[]> {
  if (emails.length === 0) return [];

  // Trim body to keep prompt small
  const emailsText = emails.map((e, i) =>
    `--- EMAIL ${i + 1} (id: ${e.emailId}) ---
FROM: ${e.sender}
SUBJECT: ${e.subject}
DATE: ${e.receivedDate}
BODY: ${e.body.slice(0, 800)}`
  ).join("\n\n");

  const prompt = `You are an academic email parser for a university student.

Analyze the following ${emails.length} faculty emails and extract ALL actionable academic events from each.

${emailsText}

Return ONLY valid JSON — an array, one entry per email, in the same order:

[
  {
    "emailId": "<the id from the email header>",
    "events": [
      {
        "important": true,
        "type": "assignment | quiz | exam | project | lab | announcement | material | class_change | attendance | other",
        "title": "short title (max 60 chars)",
        "description": "what the student needs to do or know",
        "deadline": "YYYY-MM-DD or null",
        "deadline_text": "original wording like Friday or null",
        "needs_review": false
      }
    ]
  }
]

Rules:
- One object per email, using the exact emailId shown.
- important=true for anything actionable or important to the student.
- important=false for trivial/routine messages with nothing to act on.
- NEVER invent deadlines. If not stated, deadline=null.
- Vague deadlines (e.g. "next week"): deadline=null, deadline_text=that phrase, needs_review=true.
- No useful info in email → return empty events array for that email.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  try {
    const parsed = JSON.parse(response.text!);
    return Array.isArray(parsed) ? parsed as BatchResult[] : [];
  } catch {
    return [];
  }
}

// Splits emails into chunks of CHUNK_SIZE and calls AI once per chunk
export async function analyzeAllEmails(emails: EmailBatchItem[]): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    const chunkResults = await analyzeBatch(chunk);
    results.push(...chunkResults);

    // Wait 15s between chunks to stay under free tier (5 req/min)
    if (i + CHUNK_SIZE < emails.length) {
      await new Promise((r) => setTimeout(r, 15000));
    }
  }

  return results;
}
