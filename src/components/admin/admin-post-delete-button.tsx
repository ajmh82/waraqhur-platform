"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminPostDeleteButtonProps {
  postId: string;
}

export function AdminPostDeleteButton({ postId }: AdminPostDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  async function handleDelete() {
    setResult(null);

    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setResult(payload?.error?.message ?? "تعذر حذف المنشور.");
        return;
      }

      setResult("تم حذف المنشور");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "..." : "Delete Post"}
      </button>

      {result ? (
        <p className="admin-actions__message">{result}</p>
      ) : null}
    </div>
  );
}
