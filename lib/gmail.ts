import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
);

export function getGmailClient(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return "";
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  gmailLink: string;
}

export async function fetchFacultyEmails(
  accessToken: string,
  facultyEmails: Set<string>,
  maxResults = 50
): Promise<ParsedEmail[]> {
  const gmail = getGmailClient(accessToken);

  // Build a query that searches for emails from any faculty address
  const fromQuery = Array.from(facultyEmails)
    .map((e) => `from:${e}`)
    .join(" OR ");

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: `(${fromQuery}) newer_than:60d`,
    maxResults,
  });

  const messages = listRes.data.messages ?? [];
  const parsed: ParsedEmail[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const payload = full.data.payload;
    if (!payload) continue;

    const headers = payload.headers ?? [];
    const fromRaw = getHeader(headers, "From");

    // Extract email address from "Name <email@domain>" format
    const emailMatch = fromRaw.match(/<([^>]+)>/);
    const senderEmail = (emailMatch ? emailMatch[1] : fromRaw).trim().toLowerCase();

    // Double-check it's actually faculty
    if (!facultyEmails.has(senderEmail)) continue;

    const subject = getHeader(headers, "Subject") || "(No Subject)";
    const date = getHeader(headers, "Date");
    const body = extractBody(payload);

    parsed.push({
      id: msg.id,
      threadId: full.data.threadId ?? "",
      sender: fromRaw.replace(/<[^>]+>/, "").trim().replace(/"/g, "") || senderEmail,
      senderEmail,
      subject,
      body: body.slice(0, 4000), // Trim very long emails
      receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      gmailLink: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
    });
  }

  return parsed;
}
