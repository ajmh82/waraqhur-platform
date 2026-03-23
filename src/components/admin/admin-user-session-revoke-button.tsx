"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminUserSessionRevokeButtonProps {
  userId: string;
  sessionId: string;
}

export function AdminUserSessionRevokeButton({
  userId,
  sessionId,
}: AdminUserSessionRevokeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function handleRevoke() {
    setMessage(null);

    const response = await fetch("/api/admin/users/sessions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId,
        sessionId,
      }),
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setMessage(payload?.error?.message ?? "تعذر إلغاء الجلسة.");
        return;
      }

      setMessage("تم إلغاء الجلسة");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleRevoke}
        disabled={isPending}
      >
        {isPending ? "..." : "Revoke Session"}
      </button>

      {message ? <p className="admin-actions__message">{message}</p> : null}
    </div>
  );
}
