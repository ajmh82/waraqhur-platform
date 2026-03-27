"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RequestUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface RequestRow {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED";
  createdAt: string;
  requester: RequestUser;
  target: RequestUser;
  isIncoming: boolean;
}

interface MessageRequestsPanelProps {
  locale?: "ar" | "en";
}

export function MessageRequestsPanel({ locale = "ar" }: MessageRequestsPanelProps) {
  const isArabic = locale !== "en";
  const router = useRouter();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRequests() {
    const res = await fetch("/api/messages/requests?box=incoming&status=PENDING", {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success) {
      setError(isArabic ? "تعذر تحميل طلبات المحادثة." : "Failed to load chat requests.");
      return;
    }

    const list = Array.isArray(payload?.data?.requests) ? payload.data.requests : [];
    setRows(list);
  }

  async function respond(requestId: string, action: "accept" | "reject") {
    setPendingId(requestId);
    setError(null);
    try {
      const res = await fetch(`/api/messages/requests/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر معالجة الطلب." : "Failed to process request."));
        return;
      }

      if (action === "accept" && payload?.data?.thread?.id) {
        router.push(`/messages/${payload.data.thread.id}`);
        return;
      }

      await loadRequests();
    } finally {
      setPendingId(null);
    }
  }

  useEffect(() => {
    loadRequests().catch(() => {
      setError(isArabic ? "تعذر تحميل طلبات المحادثة." : "Failed to load chat requests.");
    });
  }, []);

  return (
    <section className="state-card" style={{ display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: "18px" }}>
        {isArabic ? "طلبات المحادثة" : "Chat Requests"}
      </h2>

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isArabic ? "لا توجد طلبات حالياً." : "No pending requests."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} className="dashboard-list-item" style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gap: 2 }}>
                <strong>{r.requester.displayName}</strong>
                <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                  @{r.requester.username}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn small"
                  disabled={pendingId === r.id}
                  onClick={() => respond(r.id, "accept")}
                >
                  {isArabic ? "قبول" : "Accept"}
                </button>
                <button
                  type="button"
                  className="btn small"
                  disabled={pendingId === r.id}
                  onClick={() => respond(r.id, "reject")}
                >
                  {isArabic ? "رفض" : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
