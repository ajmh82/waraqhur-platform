"use client";

import { useEffect, useMemo, useState } from "react";
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

async function fetchRequestsBox(box: "incoming" | "outgoing"): Promise<RequestRow[]> {
  const res = await fetch(`/api/messages/requests?box=${box}&status=PENDING`, {
    credentials: "include",
    cache: "no-store",
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "Failed to load chat requests.");
  }

  return Array.isArray(payload?.data?.requests) ? payload.data.requests : [];
}

export function MessageRequestsPanel({ locale = "ar" }: MessageRequestsPanelProps) {
  const isArabic = locale !== "en";
  const router = useRouter();

  const [incomingRows, setIncomingRows] = useState<RequestRow[]>([]);
  const [outgoingRows, setOutgoingRows] = useState<RequestRow[]>([]);
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        const [incoming, outgoing] = await Promise.all([
          fetchRequestsBox("incoming"),
          fetchRequestsBox("outgoing"),
        ]);

        if (cancelled) return;
        setIncomingRows(incoming);
        setOutgoingRows(outgoing);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : isArabic
              ? "تعذر تحميل طلبات المحادثة."
              : "Failed to load chat requests."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAll();
    const id = setInterval(() => {
      void loadAll();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isArabic]);

  async function refreshAll() {
    try {
      const [incoming, outgoing] = await Promise.all([
        fetchRequestsBox("incoming"),
        fetchRequestsBox("outgoing"),
      ]);
      setIncomingRows(incoming);
      setOutgoingRows(outgoing);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : isArabic
            ? "تعذر تحديث الطلبات."
            : "Failed to refresh requests."
      );
    }
  }

  async function respond(requestId: string, action: "accept" | "reject" | "cancel") {
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
        setError(
          payload?.error?.message ??
            (isArabic ? "تعذر معالجة الطلب." : "Failed to process request.")
        );
        return;
      }

      if (action === "accept" && payload?.data?.thread?.id) {
        router.push(`/messages/${payload.data.thread.id}`);
        return;
      }

      await refreshAll();
    } finally {
      setPendingId(null);
    }
  }

  const rows = useMemo(
    () => (activeTab === "incoming" ? incomingRows : outgoingRows),
    [activeTab, incomingRows, outgoingRows]
  );

  return (
    <section className="state-card" style={{ display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: "18px" }}>
        {isArabic ? "طلبات المحادثة" : "Chat Requests"}
      </h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn small ${activeTab === "incoming" ? "primary" : ""}`}
          onClick={() => setActiveTab("incoming")}
        >
          {isArabic ? "الواردة" : "Incoming"} ({incomingRows.length})
        </button>
        <button
          type="button"
          className={`btn small ${activeTab === "outgoing" ? "primary" : ""}`}
          onClick={() => setActiveTab("outgoing")}
        >
          {isArabic ? "الصادرة" : "Outgoing"} ({outgoingRows.length})
        </button>
      </div>

      {loading ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isArabic ? "جارٍ تحميل الطلبات..." : "Loading requests..."}
        </p>
      ) : null}

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {activeTab === "incoming"
            ? isArabic
              ? "لا توجد طلبات واردة حالياً."
              : "No incoming requests."
            : isArabic
              ? "لا توجد طلبات صادرة حالياً."
              : "No outgoing requests."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => {
            const peer = activeTab === "incoming" ? r.requester : r.target;

            return (
              <div key={r.id} className="dashboard-list-item" style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong>{peer.displayName}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                    @{peer.username}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {activeTab === "incoming" ? (
                    <>
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
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn small"
                      disabled={pendingId === r.id}
                      onClick={() => respond(r.id, "cancel")}
                    >
                      {isArabic ? "إلغاء الطلب" : "Cancel Request"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
