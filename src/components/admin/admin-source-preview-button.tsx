"use client";

import { useState, useTransition } from "react";

interface AdminSourcePreviewButtonProps {
  sourceId: string;
  sourceType: string;
}

export function AdminSourcePreviewButton({
  sourceId,
  sourceType,
}: AdminSourcePreviewButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (sourceType !== "NITTER") {
    return null;
  }

  async function handlePreview() {
    setResult(null);

    const response = await fetch(`/api/admin/sources/${sourceId}/preview`, {
      method: "GET",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setResult(payload?.error?.message ?? "تعذر جلب المعاينة.");
        return;
      }

      const firstItem = payload.data?.preview?.items?.[0]?.text ?? "لا توجد عناصر";
      setResult(firstItem);
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handlePreview}
        disabled={isPending}
      >
        {isPending ? "..." : "Preview"}
      </button>

      {result ? (
        <p className="admin-actions__message">{result}</p>
      ) : null}
    </div>
  );
}
