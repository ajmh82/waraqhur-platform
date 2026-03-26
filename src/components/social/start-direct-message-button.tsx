"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface StartDirectMessageButtonProps {
  targetUserId: string;
  label?: string;
  className?: string;
}

export function StartDirectMessageButton({
  targetUserId,
  label = "مراسلة خاصة",
  className = "btn",
}: StartDirectMessageButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setError(null);

    const response = await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUserId,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر بدء المحادثة.");
      return;
    }

    startTransition(() => {
      router.push(`/messages/${payload.data.thread.id}`);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "جارٍ فتح المحادثة..." : label}
      </button>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
