"use client";

import { useState, useTransition } from "react";

export function AdminIngestAllSourcesButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function handleIngestAll() {
    setResult(null);

    const response = await fetch("/api/admin/sources/ingest-all", {
      method: "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setResult(payload?.error?.message ?? "تعذر تنفيذ ingestion الجماعية.");
        return;
      }

      setResult(
        `تم إنشاء ${payload.data.totalCreatedCount} وتخطي ${payload.data.totalSkippedCount} عبر ${payload.data.totalSources} مصدر`
      );
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn"
        onClick={handleIngestAll}
        disabled={isPending}
      >
        {isPending ? "..." : "Ingest All NITTER"}
      </button>

      {result ? (
        <p className="admin-actions__message">{result}</p>
      ) : null}
    </div>
  );
}
