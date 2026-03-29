/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

type ThreadLite = {
  id: string;
  otherUser: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

export function SharePostPanel({
  postUrl,
  open,
  onClose,
}: {
  postUrl: string;
  open: boolean;
  onClose: () => void;
}) {
  const [threads, setThreads] = useState<ThreadLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/messages", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((p) => setThreads(p?.data?.threads ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  async function sendToUser(userId: string) {
    const res = await fetch("/api/messages/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, postUrl, text: "مشاركة تغريدة" }),
    });
    if (res.ok) onClose();
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ url: postUrl });
    } else {
      await navigator.clipboard.writeText(postUrl);
      alert("تم نسخ الرابط");
    }
  }

  if (!open) return null;

  return (
    <div className="state-card" style={{ padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>مشاركة التغريدة</strong>
        <button className="btn small" onClick={onClose}>إغلاق</button>
      </div>

      <button className="btn-action" onClick={nativeShare}>مشاركة خارجية</button>

      {loading ? <p style={{ margin: 0 }}>جاري تحميل المحادثات...</p> : null}

      <div style={{ display: "grid", gap: 8 }}>
        {threads.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn small"
            style={{ justifyContent: "space-between" }}
            onClick={() => void sendToUser(t.otherUser.id)}
          >
            <span>{t.otherUser.displayName}</span>
            <span>@{t.otherUser.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
