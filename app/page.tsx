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
const TYPE_EMOJI: Record<EventType, string> = {
  assignment: "📚", quiz: "📝", exam: "🎯", project: "🔬",
  lab: "🧪", announcement: "📢", material: "📄",
  class_change: "🏫", attendance: "✅", other: "ℹ️",
};

const TYPE_COLOR: Record<EventType, { bg: string; color: string; accent: string }> = {
  assignment: { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", accent: "#3b82f6" },
  quiz:       { bg: "rgba(168,85,247,0.12)",  color: "#c084fc", accent: "#a855f7" },
  exam:       { bg: "rgba(239,68,68,0.12)",   color: "#f87171", accent: "#ef4444" },
  project:    { bg: "rgba(20,184,166,0.12)",  color: "#2dd4bf", accent: "#14b8a6" },
  lab:        { bg: "rgba(234,179,8,0.12)",   color: "#facc15", accent: "#eab308" },
  announcement:{ bg:"rgba(99,102,241,0.12)", color: "#818cf8", accent: "#6366f1" },
  material:   { bg: "rgba(34,197,94,0.12)",   color: "#4ade80", accent: "#22c55e" },
  class_change:{ bg:"rgba(249,115,22,0.12)", color: "#fb923c", accent: "#f97316" },
  attendance: { bg: "rgba(234,179,8,0.12)",   color: "#facc15", accent: "#eab308" },
  other:      { bg: "rgba(107,114,128,0.12)", color: "#9ca3af", accent: "#6b7280" },
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function formatDeadline(dateStr: string): { label: string; color: string } {
  const days = daysUntil(dateStr);
  const date = new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });

  if (days < 0)  return { label: `Overdue · ${date}`, color: "#ef4444" };
  if (days === 0) return { label: `Due Today · ${date}`, color: "#ef4444" };
  if (days === 1) return { label: `Tomorrow · ${date}`, color: "#f97316" };
  if (days <= 3)  return { label: `${days} days · ${date}`, color: "#f97316" };
  if (days <= 7)  return { label: `${days} days · ${date}`, color: "#eab308" };
  return { label: date, color: "#8b8fa8" };
}

function formatReceived(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const FILTERS = [
  { key: "all",          label: "All" },
  { key: "assignment",   label: "📚 Assignments" },
  { key: "quiz",         label: "📝 Quizzes" },
  { key: "exam",         label: "🎯 Exams" },
  { key: "project",      label: "🔬 Projects" },
  { key: "lab",          label: "🧪 Labs" },
  { key: "announcement", label: "📢 Announcements" },
  { key: "material",     label: "📄 Materials" },
  { key: "class_change", label: "🏫 Class Changes" },
  { key: "completed",    label: "✅ Completed" },
];


// ── Event card ────────────────────────────────────
function EventCard({ ev, onToggle }: { ev: Event; onToggle: (id: string) => void }) {
  const colors = TYPE_COLOR[ev.type];
  const dl = ev.deadline ? formatDeadline(ev.deadline) : null;

  return (
    <div
      className={`event-card ${ev.completed ? "completed" : ""}`}
      style={{ "--card-accent": colors.accent } as React.CSSProperties}
    >
      <span className="event-emoji">{TYPE_EMOJI[ev.type]}</span>

      <div className="event-body">
        <div className="event-top">
          <span className="event-title">{ev.title}</span>
          <div className="event-badge">
            {dl && (
              <span
                className="badge badge-deadline"
                style={{ color: dl.color, background: `${dl.color}18` }}
              >
                {dl.label}
              </span>
            )}
            {ev.deadline_text && !ev.deadline && (
              <span className="badge" style={{ color: "#8b8fa8", background: "rgba(107,114,128,0.1)" }}>
                {ev.deadline_text}
              </span>
            )}
            <span className="badge" style={{ background: colors.bg, color: colors.color }}>
              {ev.type.replace("_", " ")}
            </span>
          </div>
        </div>

        <p className="event-desc">{ev.description}</p>

        <div className="event-meta">
          <span className="meta-item">
            <span>👤</span>
            <span>{ev.sender}</span>
          </span>
          <span className="meta-item">
            <span>📅</span>
            <span>{formatReceived(ev.receivedAt)}</span>
          </span>
          {ev.needs_review && (
            <span className="review-warning">⚠️ Verify deadline</span>
          )}
        </div>
      </div>

      <div className="event-actions">
        <button
          id={`btn-complete-${ev.id}`}
          className="btn-check"
          title={ev.completed ? "Mark incomplete" : "Mark complete"}
          onClick={() => onToggle(ev.id)}
        >
          {ev.completed ? "✓" : "○"}
        </button>
        <a
          id={`btn-gmail-${ev.id}`}
          className="btn-gmail"
          href={ev.gmailLink}
          target="_blank"
          rel="noreferrer"
          title="View original email"
        >
          ↗
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
          `✅ Synced! ${data.processed} emails processed, ${data.newEvents} new items found.`,
          "success"
        );
      } else if (data.newEvents > 0) {
        showToast(`🔄 Auto-synced: ${data.newEvents} new item${data.newEvents === 1 ? "" : "s"} found.`, "success");
      }
    } catch (err: any) {
      if (!silent) showToast(`❌ ${err.message}`, "error");
    } finally {
      setSyncing(false);
    }
  }, [loadEvents]);


  const handleToggle = async (id: string) => {
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
    await fetch(`/api/events/${id}/complete`, { method: "POST" });
  };

  // ── Filtered events ──
  const filtered = events.filter((e) => {
    if (filter === "all") return !e.completed;
    if (filter === "completed") return e.completed;
    return e.type === filter && !e.completed;
  });

  // ── Stats ──
  const active = events.filter((e) => !e.completed);
  const urgentCount = active.filter((e) => e.deadline && daysUntil(e.deadline) <= 3).length;
  const assignCount = active.filter((e) => e.type === "assignment").length;
  const quizCount   = active.filter((e) => e.type === "quiz").length;
  const examCount   = active.filter((e) => e.type === "exam").length;
  const doneCount   = events.filter((e) => e.completed).length;

  // ── Group filtered events into sections ──
  const urgent = filtered.filter(
    (e) => e.deadline && daysUntil(e.deadline) <= 3 && filter === "all"
  );
  const rest = filter === "all"
    ? filtered.filter((e) => !(e.deadline && daysUntil(e.deadline) <= 3))
    : filtered;

  return (
    <div className="shell">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="logo-icon">🎓</span>
          <h2>Faculty Mail Tracker</h2>
        </div>
        <div className="header-right">
          <span className="sync-status">
            {lastSynced && <>Last synced {lastSynced}</>}
          </span>
          <button
            id="btn-sync"
            className="btn-sync"
            onClick={() => handleSync()}
            disabled={syncing}
          >
            <span className={syncing ? "spin" : ""}>⟳</span>
            {syncing ? "Syncing…" : "Sync Emails"}
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="content">
        {/* Stats */}
        <div className="stats-row">
          {[
            { num: urgentCount, label: "Urgent", color: "#ef4444" },
            { num: assignCount, label: "Assignments", color: "#3b82f6" },
            { num: quizCount,   label: "Quizzes",     color: "#a855f7" },
            { num: examCount,   label: "Exams",       color: "#ef4444" },
            { num: doneCount,   label: "Completed",   color: "#22c55e" },
          ].map(({ num, label, color }) => (
            <div className="stat-card" key={label}>
              <div className="stat-num" style={{ color }}>{num}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
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

        {/* Content */}
        {filtered.length === 0 && urgent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {events.length === 0 ? "📭" : "✨"}
            </div>
            <h3>
              {events.length === 0
                ? "No items yet — click Sync Emails to get started"
                : "Nothing here"}
            </h3>
            <p>
              {events.length === 0
                ? "Make sure your faculty email addresses are set in lib/faculty.ts"
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          <>
            {urgent.length > 0 && (
              <div className="section">
                <div className="section-title">🔴 Due in 3 days or less</div>
                <div className="events-list">
                  {urgent.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="section">
                <div className="section-title">
                  {filter === "all" ? "📋 Upcoming" : ""}
                  {filter === "completed" ? "✅ Completed" : ""}
                  {!["all", "completed"].includes(filter) ? "Results" : ""}
                </div>
                <div className="events-list">
                  {rest.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────
export default function Home() {
  return <Dashboard />;
}
