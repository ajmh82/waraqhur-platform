"use client";

import { useState } from "react";

export function SourceIngestButton({
  sourceId,
}: {
  sourceId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleIngest = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`/api/admin/sources/${sourceId}/ingest`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || "فشل تحديث المصدر");
      }

      const created = data?.data?.createdCount ?? 0;
      const skipped = data?.data?.skippedCount ?? 0;

      setMessage(`تم التحديث: ${created} جديد / ${skipped} متكرر`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <button
        onClick={handleIngest}
        disabled={loading}
        style={{
          padding: "8px 12px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.14)",
          background: loading ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.18)",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "جاري التحديث..." : "🔄 تحديث الآن"}
      </button>

      {message ? (
        <div
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
