"use client";

import { useEffect, useState } from "react";

interface RequestRow {
  id: string;
  target: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface InboxThread {
  id: string;
  unreadCount: number;
}

interface MessageRequestsPanelProps {
  locale?: "ar" | "en";
}

type MessagesFilter = "all" | "incoming_unread" | "outgoing_pending";

const copy = {
  ar: {
    title: "الرسائل",
    incoming: "الوارد",
    outgoing: "الصادر",
    loading: "جارٍ تحميل البيانات...",
    loadFailed: "تعذر تحميل البيانات.",
    authRequired: "يجب تسجيل الدخول.",
  },
  en: {
    title: "Messages",
    incoming: "Incoming",
    outgoing: "Outgoing",
    loading: "Loading...",
    loadFailed: "Failed to load data.",
    authRequired: "You need to sign in.",
  },
} as const;

export function MessageRequestsPanel({ locale = "ar" }: MessageRequestsPanelProps) {
  const t = copy[locale];

  const [activeFilter, setActiveFilter] = useState<MessagesFilter>("all");
  const [incomingUnreadCount, setIncomingUnreadCount] = useState(0);
  const [outgoingPendingCount, setOutgoingPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  function emitFilter(filter: MessagesFilter) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("messages:filter-changed", { detail: { filter } }));
  }

  function toggleFilter(next: MessagesFilter) {
    const finalFilter = activeFilter === next ? "all" : next;
    setActiveFilter(finalFilter);
    emitFilter(finalFilter);
  }

  async function fetchIncomingUnreadCount() {
    const res = await fetch("/api/messages", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const payload = await res.json().catch(() => null);

    if (res.status === 401) {
      return { unauthorized: true as const, count: 0 };
    }

    if (!res.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? t.loadFailed);
    }

    const rows = Array.isArray(payload?.data?.threads)
      ? (payload.data.threads as InboxThread[])
      : [];

    const count = rows.reduce((sum, row) => sum + Math.max(0, Number(row.unreadCount || 0)), 0);
    return { unauthorized: false as const, count };
  }

  async function fetchOutgoingPendingCount() {
    const res = await fetch("/api/messages/requests?box=outgoing&status=PENDING", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const payload = await res.json().catch(() => null);

    if (res.status === 401) {
      return { unauthorized: true as const, count: 0 };
    }

    if (!res.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? t.loadFailed);
    }

    const rows = Array.isArray(payload?.data?.requests)
      ? (payload.data.requests as RequestRow[])
      : [];

    return { unauthorized: false as const, count: rows.length };
  }

  useEffect(() => {
    if (isUnauthorized) return;

    let cancelled = false;

    async function loadCounts() {
      setLoading(true);
      setError(null);

      try {
        const [incoming, outgoing] = await Promise.all([
          fetchIncomingUnreadCount(),
          fetchOutgoingPendingCount(),
        ]);

        if (cancelled) return;

        if (incoming.unauthorized || outgoing.unauthorized) {
          setIsUnauthorized(true);
          setError(t.authRequired);
          return;
        }

        setIncomingUnreadCount(incoming.count);
        setOutgoingPendingCount(outgoing.count);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("messages:changed"));
        }
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : t.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCounts();

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadCounts();
    }, 5000);

    const onFocus = () => void loadCounts();
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadCounts();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isUnauthorized, t.authRequired, t.loadFailed]);

  return (
    <section className="state-card" style={{ display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: "18px" }}>{t.title}</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn small ${activeFilter === "incoming_unread" ? "primary" : ""}`}
          onClick={() => toggleFilter("incoming_unread")}
        >
          {t.incoming} ({incomingUnreadCount})
        </button>

        <button
          type="button"
          className={`btn small ${activeFilter === "outgoing_pending" ? "primary" : ""}`}
          onClick={() => toggleFilter("outgoing_pending")}
        >
          {t.outgoing} ({outgoingPendingCount})
        </button>
      </div>

      {loading ? <p style={{ margin: 0, color: "var(--muted)" }}>{t.loading}</p> : null}
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
    </section>
  );
}
