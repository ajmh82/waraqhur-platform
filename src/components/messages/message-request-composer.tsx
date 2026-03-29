"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface MessageRequestComposerProps {
  locale?: "ar" | "en";
}

export function MessageRequestComposer({ locale = "ar" }: MessageRequestComposerProps) {
  const isArabic = locale !== "en";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const keyword = q.trim();
    if (keyword.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          setError(isArabic ? "تعذر تحميل نتائج البحث." : "Failed to load search results.");
          return;
        }
        setUsers(Array.isArray(payload?.data?.users) ? payload.data.users : []);
      } catch {
        setError(isArabic ? "تعذر تحميل نتائج البحث." : "Failed to load search results.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [open, q, isArabic]);

  async function sendRequest(userId: string) {
    setSendingId(userId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/messages/requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(
          payload?.error?.message ??
            (isArabic ? "تعذر إرسال طلب المحادثة." : "Failed to send chat request.")
        );
        return;
      }

      if (payload?.data?.mode === "thread_exists" && payload?.data?.thread?.id) {
        router.push(`/messages/${payload.data.thread.id}`);
        return;
      }

      setNotice(
        isArabic
          ? "تم إرسال طلب المحادثة بنجاح."
          : "Chat request sent successfully."
      );
    } finally {
      setSendingId(null);
    }
  }

  return (
    <section className="state-card" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          {isArabic ? "محادثة جديدة" : "New Chat"}
        </h2>
        <button type="button" className="btn small" onClick={() => setOpen((v) => !v)}>
          {open ? (isArabic ? "إغلاق" : "Close") : "+"}
        </button>
      </div>

      {open ? (
        <>
          <input
            className="settings-form__input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isArabic ? "ابحث عن مستخدم..." : "Search users..."}
          />

          {loading ? <p style={{ margin: 0, color: "var(--muted)" }}>{isArabic ? "جارٍ البحث..." : "Searching..."}</p> : null}
          {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
          {notice ? <p style={{ margin: 0, color: "#86efac" }}>{notice}</p> : null}

          <div style={{ display: "grid", gap: 8 }}>
            {users.map((u) => (
              <div key={u.id} className="dashboard-list-item" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block" }}>{u.displayName}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "13px" }}>@{u.username}</span>
                </div>
                <button
                  type="button"
                  className="btn small"
                  disabled={sendingId === u.id}
                  onClick={() => sendRequest(u.id)}
                >
                  {sendingId === u.id
                    ? (isArabic ? "جارٍ الإرسال..." : "Sending...")
                    : (isArabic ? "طلب محادثة" : "Request Chat")}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
