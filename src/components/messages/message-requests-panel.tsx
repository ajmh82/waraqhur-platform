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

const copy = {
  ar: {
    title: "طلبات المحادثة",
    incoming: "الواردة",
    outgoing: "الصادرة",
    loading: "جارٍ تحميل الطلبات...",
    loadFailed: "تعذر تحميل طلبات المحادثة.",
    authRequired: "يجب تسجيل الدخول لعرض طلبات المحادثة.",
    incomingEmpty: "لا توجد طلبات واردة حالياً.",
    outgoingEmpty: "لا توجد طلبات صادرة حالياً.",
    accept: "قبول",
    reject: "رفض",
    cancel: "إلغاء الطلب",
    processFailed: "تعذر معالجة الطلب.",
  },
  en: {
    title: "Chat Requests",
    incoming: "Incoming",
    outgoing: "Outgoing",
    loading: "Loading requests...",
    loadFailed: "Failed to load chat requests.",
    authRequired: "You need to sign in to view chat requests.",
    incomingEmpty: "No incoming requests.",
    outgoingEmpty: "No outgoing requests.",
    accept: "Accept",
    reject: "Reject",
    cancel: "Cancel Request",
    processFailed: "Failed to process request.",
  },
} as const;

export function MessageRequestsPanel({ locale = "ar" }: MessageRequestsPanelProps) {
  const t = copy[locale];
  const router = useRouter();

  const [incomingRows, setIncomingRows] = useState<RequestRow[]>([]);
  const [outgoingRows, setOutgoingRows] = useState<RequestRow[]>([]);
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  async function fetchRequestsBox(box: "incoming" | "outgoing") {
    const res = await fetch(`/api/messages/requests?box=${box}&status=PENDING`, {
      credentials: "include",
      cache: "no-store",
    });

    const payload = await res.json().catch(() => null);

    if (res.status === 401) {
      return { unauthorized: true as const, rows: [] as RequestRow[] };
    }

    if (!res.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? t.loadFailed);
    }

    return {
      unauthorized: false as const,
      rows: Array.isArray(payload?.data?.requests) ? (payload.data.requests as RequestRow[]) : [],
    };
  }

  async function refreshAll() {
    try {
      const [incoming, outgoing] = await Promise.all([
        fetchRequestsBox("incoming"),
        fetchRequestsBox("outgoing"),
      ]);

      if (incoming.unauthorized || outgoing.unauthorized) {
        setIsUnauthorized(true);
        setError(t.authRequired);
        return;
      }

      setIncomingRows(incoming.rows);
      setOutgoingRows(outgoing.rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.loadFailed);
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

      if (res.status === 401) {
        setIsUnauthorized(true);
        setError(t.authRequired);
        return;
      }

      if (!res.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.processFailed);
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

  useEffect(() => {
    if (isUnauthorized) {
      setLoading(false);
      return;
    }

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

        if (incoming.unauthorized || outgoing.unauthorized) {
          setIsUnauthorized(true);
          setError(t.authRequired);
          return;
        }

        setIncomingRows(incoming.rows);
        setOutgoingRows(outgoing.rows);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : t.loadFailed);
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
  }, [isUnauthorized, t.authRequired, t.loadFailed]);

  const rows = useMemo(
    () => (activeTab === "incoming" ? incomingRows : outgoingRows),
    [activeTab, incomingRows, outgoingRows]
  );

  return (
    <section className="state-card" style={{ display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: "18px" }}>{t.title}</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn small ${activeTab === "incoming" ? "primary" : ""}`}
          onClick={() => setActiveTab("incoming")}
        >
          {t.incoming} ({incomingRows.length})
        </button>
        <button
          type="button"
          className={`btn small ${activeTab === "outgoing" ? "primary" : ""}`}
          onClick={() => setActiveTab("outgoing")}
        >
          {t.outgoing} ({outgoingRows.length})
        </button>
      </div>

      {loading ? <p style={{ margin: 0, color: "var(--muted)" }}>{t.loading}</p> : null}
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {activeTab === "incoming" ? t.incomingEmpty : t.outgoingEmpty}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => {
            const peer = activeTab === "incoming" ? r.requester : r.target;

            return (
              <div key={r.id} className="dashboard-list-item" style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong>{peer.displayName}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "13px" }}>@{peer.username}</span>
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
                        {t.accept}
                      </button>
                      <button
                        type="button"
                        className="btn small"
                        disabled={pendingId === r.id}
                        onClick={() => respond(r.id, "reject")}
                      >
                        {t.reject}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn small"
                      disabled={pendingId === r.id}
                      onClick={() => respond(r.id, "cancel")}
                    >
                      {t.cancel}
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
