"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminUserRoleRemoveButtonProps {
  userId: string;
  roleKey: string;
}

export function AdminUserRoleRemoveButton({
  userId,
  roleKey,
}: AdminUserRoleRemoveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function handleRemove() {
    setMessage(null);

    const response = await fetch("/api/admin/users/roles", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId,
        roleKey,
      }),
    });

    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setMessage(payload?.error?.message ?? "تعذر فك الدور.");
        return;
      }

      setMessage("تم فك الدور");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className="btn small"
        onClick={handleRemove}
        disabled={isPending}
      >
        {isPending ? "..." : "Remove Role"}
      </button>

      {message ? <p className="admin-actions__message">{message}</p> : null}
    </div>
  );
}
