"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminSourceRestoreButtonProps {
  sourceId: string;
  status: string;
}

export function AdminSourceRestoreButton({
  sourceId,
  status,
}: AdminSourceRestoreButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (status !== "ARCHIVED") {
    return null;
  }

  async function handleRestore() {
    setResult(null);

    const response = await fetch(`/api/sources/${sourceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        status: "ACTIVE",
      }),
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setResult(payload?.error?.message ?? "تعذر استعادة المصدر.");
        return;
      }

      setResult("تمت استعادة المصدر");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleRestore}
        disabled={isPending}
      >
        {isPending ? "..." : "Restore"}
      </button>

      {result ? (
        <p className="admin-actions__message">{result}</p>
      ) : null}
    </div>
  );
}
