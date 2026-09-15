"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────
type EventType =
  | "assignment" | "quiz" | "exam" | "project" | "lab"
  | "announcement" | "material" | "class_change" | "attendance" | "other";

interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string;
  deadline: string | null;
  deadline_text: string | null;
  needs_review: boolean;
  sender: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  gmailLink: string;
  completed: boolean;
}

// ── Helpers ──────────────────────────────────────
const TYPE_LABEL: Record<EventType, string> = {
  assignment: "Assignment", quiz: "Quiz", exam: "Exam", project: "Project",
  lab: "Lab", announcement: "Notice", material: "Material",
  class_change: "Schedule", attendance: "Attendance", other: "Other",
};

const TYPE_DOT: Record<EventType, string> = {
  assignment:   "#3a6b4a",
  quiz:         "#5a6e5a",
  exam:         "#8b3a3a",
  project:      "#3a5a6b",
  lab:          "#6b5a3a",
  announcement: "#5a6e5a",
  material:     "#4a5a4a",
  class_change: "#8b6b3a",
  attendance:   "#7a6e2a",
  other:        "#8a8a80",
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function formatDeadline(dateStr: string): { label: string; status: string; color: string; bg: string } {
  const days = daysUntil(dateStr);
  const date = new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });

  if (days < 0)  return { label: date, status: "OVERDUE",  color: "#8b3a3a", bg: "var(--status-red-bg)" };
  if (days === 0) return { label: date, status: "TODAY",    color: "#8b3a3a", bg: "var(--status-red-bg)" };
  if (days === 1) return { label: date, status: "TOMORROW", color: "#8b6b3a", bg: "var(--status-orange-bg)" };
  if (days <= 3)  return { label: date, status: `${days}D LEFT`,  color: "#8b6b3a", bg: "var(--status-orange-bg)" };
  if (days <= 7)  return { label: date, status: `${days}D LEFT`,  color: "#7a6e2a", bg: "var(--status-yellow-bg)" };
  return { label: date, status: "", color: "#8a8a80", bg: "transparent" };
}

function formatReceived(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

const FILTERS = [
  { key: "all",          label: "Overview" },
  { key: "assignment",   label: "Assignments" },
  { key: "quiz",         label: "Quizzes" },
  { key: "exam",         label: "Exams" },
  { key: "project",      label: "Projects" },
  { key: "announcement", label: "Notices" },
  { key: "completed",    label: "Completed" },
];

// ── Event Row ─────────────────────────────────────
function EventRow({ ev, onToggle }: { ev: Event; onToggle: (id: string) => void }) {
  const dotColor = TYPE_DOT[ev.type];
  const dl = ev.deadline ? formatDeadline(ev.deadline) : null;

  return (
    <div className={`event-card ${ev.completed ? "completed" : ""}`}>
      <div
        className="event-type-indicator"
        style={{ background: dotColor }}
        title={TYPE_LABEL[ev.type]}
      />

      <div className="event-body">
        <div className="event-top-row">
          <span className="event-title">{ev.title}</span>
          <div className="event-badges">
            {dl && dl.status && (
              <span
                className="status-tag"
                style={{ color: dl.color, background: dl.bg }}
              >
                <span className="status-dot" style={{ background: dl.color }} />
                {dl.status}
              </span>
            )}
            <span className="badge" style={{
              background: "var(--bg-input)",
              color: "var(--text3)"
            }}>
              {TYPE_LABEL[ev.type]}
            </span>
          </div>
        </div>

        <p className="event-desc">{ev.description}</p>

        <div className="event-meta">
          <span className="meta-item">{ev.sender}</span>
          <span className="meta-divider" />
          <span className="meta-item">{formatReceived(ev.receivedAt)}</span>
          {ev.deadline && (
            <>
              <span className="meta-divider" />
              <span className="meta-item">Due {dl?.label}</span>
            </>
          )}
          {ev.deadline_text && !ev.deadline && (
            <>
              <span className="meta-divider" />
              <span className="meta-item">{ev.deadline_text}</span>
            </>
          )}
          {ev.needs_review && (
            <span className="status-tag" style={{
              color: "var(--status-orange)", background: "var(--status-orange-bg)"
            }}>
              Verify
            </span>
          )}
        </div>
      </div>

      <div className="event-actions">
        <button
          id={`btn-complete-${ev.id}`}
          className="btn-action btn-done"
          title={ev.completed ? "Mark incomplete" : "Mark complete"}
          onClick={() => onToggle(ev.id)}
        >
          {ev.completed ? "Undo" : "Done"}
        </button>
        <a
          id={`btn-gmail-${ev.id}`}
          className="btn-action"
          href={ev.gmailLink}
          target="_blank"
          rel="noreferrer"
          title="View original email"
        >
          View
        </a>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────
function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events ?? []);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleSync = useCallback(async (silent = false) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      setLastSynced(new Date().toLocaleTimeString("en-IN"));
      await loadEvents();

      if (!silent) {
        showToast(
          `Synced — ${data.processed} emails processed, ${data.newEvents} new items.`,
          "success"
        );
      } else if (data.newEvents > 0) {
        showToast(`Auto-synced: ${data.newEvents} new item${data.newEvents === 1 ? "" : "s"}.`, "success");
      }
    } catch (err: any) {
      if (!silent) showToast(err.message, "error");
    } finally {
      setSyncing(false);
    }
  }, [loadEvents]);

  const handleToggle = async (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
    await fetch(`/api/events/${id}/complete`, { method: "POST" });
  };

  const filtered = events.filter((e) => {
    if (filter === "all") return !e.completed;
    if (filter === "completed") return e.completed;
    return e.type === filter && !e.completed;
  });

  const active = events.filter((e) => !e.completed);
  const urgentCount = active.filter((e) => e.deadline && daysUntil(e.deadline) <= 3).length;
  const assignCount = active.filter((e) => e.type === "assignment").length;
  const examCount   = active.filter((e) => e.type === "exam").length;
  const doneCount   = events.filter((e) => e.completed).length;

  const urgent = filtered.filter(
    (e) => e.deadline && daysUntil(e.deadline) <= 3 && filter === "all"
  );
  const rest = filter === "all"
    ? filtered.filter((e) => !(e.deadline && daysUntil(e.deadline) <= 3))
    : filtered;

  return (
    <div className="shell">
      <header className="header">
        <div className="header-brand">
          <h2>Faculty Mail Tracker</h2>
        </div>
        <div className="header-right">
          <span className="sync-status">
            {lastSynced && <>Last sync {lastSynced}</>}
          </span>
          <button
            id="btn-sync"
            className="btn-sync"
            onClick={() => handleSync()}
            disabled={syncing}
          >
            <span className={syncing ? "spin" : ""}>⟳</span>
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <button
            id="btn-theme"
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="content">
        <div className="overview-header">
          <h1 className="overview-title">Today&apos;s Overview</h1>
          <p className="overview-sub">
            {active.length > 0
              ? `${active.length} active items${urgentCount > 0 ? ` | ${urgentCount} urgent` : ''} | ${doneCount} completed`
              : 'No pending items'}
          </p>
        </div>

        <div className="stats-row">
          {[
            { num: active.length, label: "Active" },
            { num: urgentCount,   label: "Urgent" },
            { num: assignCount,   label: "Assignments" },
            { num: examCount,     label: "Exams" },
            { num: doneCount,     label: "Completed" },
          ].map(({ num, label }) => (
            <div className="stat-card" key={label}>
              <div className="stat-label">{label}</div>
              <div className="stat-num">{String(num).padStart(2, '0')}</div>
            </div>
          ))}
        </div>

        <div className="filter-bar">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              id={`filter-${key}`}
              className={`filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && urgent.length === 0 ? (
          <div className="empty-state">
            <h3>
              {events.length === 0
                ? "No items yet — click Sync to get started"
                : "Nothing here"}
            </h3>
            <p>
              {events.length === 0
                ? "Make sure your faculty emails are configured"
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          <>
            {urgent.length > 0 && (
              <div className="section">
                <div className="section-title">
                  <span className="dot" style={{ background: "var(--status-red)" }} />
                  Due in 3 days or less
                </div>
                <div className="events-list">
                  {urgent.map((ev) => (
                    <EventRow key={ev.id} ev={ev} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="section">
                <div className="section-title">
                  <span className="dot" style={{ background: "var(--status-green)" }} />
                  {filter === "all" ? "Upcoming" : ""}
                  {filter === "completed" ? "Completed" : ""}
                  {!["all", "completed"].includes(filter) ? "Results" : ""}
                </div>
                <div className="events-list">
                  {rest.map((ev) => (
                    <EventRow key={ev.id} ev={ev} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return <Dashboard />;
}
