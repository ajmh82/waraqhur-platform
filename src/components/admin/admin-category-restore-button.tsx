"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminCategoryRestoreButtonProps {
  categoryId: string;
  status: string;
}

export function AdminCategoryRestoreButton({
  categoryId,
  status,
}: AdminCategoryRestoreButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "ARCHIVED") {
    return <span className="btn small">Active</span>;
  }

  async function handleRestore() {
    setError(null);

    const response = await fetch(`/api/categories/${categoryId}`, {
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

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر استعادة التصنيف.");
      return;
    }

    startTransition(() => {
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

      {error ? (
        <p style={{ color: "#ff7b7b", margin: 0, fontSize: "13px" }}>{error}</p>
      ) : null}
    </div>
  );
}
