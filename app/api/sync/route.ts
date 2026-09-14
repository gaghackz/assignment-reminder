import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchFacultyEmails } from "@/lib/gmail";
import { analyzeAllEmails, EmailBatchItem } from "@/lib/ai";
import {
  addEvents,
  getProcessedEmailIds,
  markEmailsProcessed,
  countEvents,
  getLastSynced,
  StoredEvent,
} from "@/lib/store";
import { FACULTY_EMAILS, getFacultyName } from "@/lib/faculty";

export async function POST() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json(
      { error: "No Gmail access token. Please sign out and sign in again." },
      { status: 403 }
    );
  }

  try {
    const emails = await fetchFacultyEmails(accessToken, FACULTY_EMAILS, 50);

    // Load already-processed IDs from DB
    const processedIds = await getProcessedEmailIds();
    const newEmails = emails.filter((e) => !processedIds.has(e.id));
    const skipped = emails.length - newEmails.length;

    if (newEmails.length === 0) {
      const total = await countEvents();
      const lastSynced = await getLastSynced();
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped,
        newEvents: 0,
        total,
        lastSynced: lastSynced ?? new Date().toISOString(),
      });
    }

    // Mark all as processed upfront (prevents duplicates if request is retried)
    await markEmailsProcessed(newEmails.map((e) => e.id));

    // Build batch items
    const batchItems: EmailBatchItem[] = newEmails.map((e) => ({
      emailId: e.id,
      sender: getFacultyName(e.senderEmail) || e.sender,
      subject: e.subject,
      body: e.body,
      receivedDate: e.receivedAt.split("T")[0],
    }));

    // One AI call (or a few chunked calls) instead of one per email
    const batchResults = await analyzeAllEmails(batchItems);

    // Build a lookup map from emailId → email metadata
    const emailMeta = Object.fromEntries(newEmails.map((e) => [e.id, e]));

    const newEvents: StoredEvent[] = [];

    for (const result of batchResults) {
      const meta = emailMeta[result.emailId];
      if (!meta) continue;

      for (const ev of result.events) {
        if (!ev.important) continue;

        const storedEvent: StoredEvent = {
          ...ev,
          id: `${result.emailId}-${Math.random().toString(36).slice(2, 7)}`,
          emailId: result.emailId,
          sender: getFacultyName(meta.senderEmail) || meta.sender,
          senderEmail: meta.senderEmail,
          subject: meta.subject,
          receivedAt: meta.receivedAt,
          gmailLink: meta.gmailLink,
          completed: false,
          createdAt: new Date().toISOString(),
        };

        newEvents.push(storedEvent);
      }
    }

    await addEvents(newEvents);

    const total = await countEvents();
    const lastSynced = await getLastSynced();

    return NextResponse.json({
      success: true,
      processed: newEmails.length,
      skipped,
      newEvents: newEvents.length,
      total,
      lastSynced,
    });
  } catch (err: any) {
    console.error("[sync error]", err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
