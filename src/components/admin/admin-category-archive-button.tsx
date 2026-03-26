"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminCategoryArchiveButtonProps {
  categoryId: string;
  status: string;
}

export function AdminCategoryArchiveButton({
  categoryId,
  status,
}: AdminCategoryArchiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (status === "ARCHIVED") {
    return <span>-</span>;
  }

  async function handleArchive() {
    setMessage(null);

    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setMessage(payload?.error?.message ?? "تعذر أرشفة التصنيف.");
        return;
      }

      setMessage("تمت الأرشفة");
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

      {message ? (
        <p className="admin-actions__message">{message}</p>
      ) : null}
    </div>
  );
}
