"use client";

import { useState, useTransition } from "react";

interface AdminSourceIngestButtonProps {
  sourceId: string;
  sourceType: string;
}

export function AdminSourceIngestButton({
  sourceId,
  sourceType,
}: AdminSourceIngestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (sourceType !== "NITTER") {
    return null;
  }

  async function handleIngest() {
    setResult(null);

    const response = await fetch(`/api/admin/sources/${sourceId}/ingest`, {
      method: "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setResult(payload?.error?.message ?? "تعذر تنفيذ ingestion.");
        return;
      }

      setResult(
        `تم إنشاء ${payload.data.createdCount} وتخطي ${payload.data.skippedCount}`
      );
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleIngest}
        disabled={isPending}
      >
        {isPending ? "..." : "جلب"}
      </button>

      {result ? (
        <p className="admin-actions__message">{result}</p>
      ) : null}
    </div>
  );
}
