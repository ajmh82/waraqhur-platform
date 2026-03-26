"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminSourceArchiveButtonProps {
  sourceId: string;
  status: string;
}

export function AdminSourceArchiveButton({
  sourceId,
  status,
}: AdminSourceArchiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (status !== "ACTIVE") {
    return null;
  }

  async function handleArchive() {
    setResult(null);

    const response = await fetch(`/api/sources/${sourceId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setResult(payload?.error?.message ?? "تعذر أرشفة المصدر.");
        return;
      }

      setResult("تمت أرشفة المصدر");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleArchive}
        disabled={isPending}
      >
        {isPending ? "..." : "أرشفة"}
      </button>

      {result ? (
        <p className="admin-actions__message">{result}</p>
      ) : null}
    </div>
  );
}
