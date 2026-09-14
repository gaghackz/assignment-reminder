import prisma from "./prisma";
import { ExtractedEvent } from "./ai";

// ─────────────────────────────────────────────────────────
//  Prisma-backed store — persists across restarts in Neon.
// ─────────────────────────────────────────────────────────

export interface StoredEvent extends ExtractedEvent {
  id: string;
  emailId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  gmailLink: string;
  completed: boolean;
  createdAt: string;
}

// Convert a Prisma Event row → StoredEvent shape the UI expects
function toStoredEvent(row: any): StoredEvent {
  return {
    id: row.id,
    emailId: row.emailId,
    type: row.type as StoredEvent["type"],
    title: row.title,
    description: row.description,
    deadline: row.deadline ?? null,
    deadline_text: row.deadline_text ?? null,
    needs_review: row.needs_review,
    important: row.important,
    sender: row.sender,
    senderEmail: row.senderEmail,
    subject: row.subject,
    receivedAt: row.receivedAt,
    gmailLink: row.gmailLink,
    completed: row.completed,
    createdAt: row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : String(row.createdAt),
  };
}

export async function getProcessedEmailIds(): Promise<Set<string>> {
  const rows = await prisma.processedEmail.findMany({ select: { id: true } });
  return new Set(rows.map((r: { id: string }) => r.id));
}

export async function markEmailsProcessed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.processedEmail.createMany({
    data: ids.map((id) => ({ id })),
    skipDuplicates: true,
  });
}

export async function addEvents(newEvents: StoredEvent[]): Promise<void> {
  if (newEvents.length === 0) return;
  await prisma.event.createMany({
    data: newEvents.map((ev) => ({
      id: ev.id,
      emailId: ev.emailId,
      type: ev.type,
      title: ev.title,
      description: ev.description,
      deadline: ev.deadline ?? null,
      deadline_text: ev.deadline_text ?? null,
      needs_review: ev.needs_review,
      important: ev.important,
      sender: ev.sender,
      senderEmail: ev.senderEmail,
      subject: ev.subject,
      receivedAt: ev.receivedAt,
      gmailLink: ev.gmailLink,
      completed: ev.completed,
    })),
    skipDuplicates: true,
  });
}

export async function markCompleted(id: string): Promise<void> {
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) return;
  await prisma.event.update({
    where: { id },
    data: { completed: !ev.completed },
  });
}

export async function getEvents(): Promise<StoredEvent[]> {
  const rows = await prisma.event.findMany({
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toStoredEvent);
}

export async function countEvents(): Promise<number> {
  return prisma.event.count();
}

export async function getLastSynced(): Promise<string | null> {
  const latest = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
  return latest ? latest.createdAt.toISOString() : null;
}
