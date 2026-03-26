"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminIngestAllSourcesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function handleIngestAll() {
    setResult(null);

    const confirmed = window.confirm(
      "هل تريد تنفيذ ingestion لكل مصادر NITTER الآن؟"
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/admin/sources/ingest-all", {
      method: "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setResult(payload?.error?.message ?? "تعذر تنفيذ ingestion الجماعية.");
      return;
    }

    setResult("تم تنفيذ ingestion الجماعية بنجاح.");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleIngestAll}
        disabled={isPending}
      >
        {isPending ? "..." : "جلب جميع مصادر NITTER"}
      </button>

      {result ? (
        <p style={{ margin: 0, color: "#a9b7c9", fontSize: "13px" }}>
          {result}
        </p>
      ) : null}
    </div>
  );
}
