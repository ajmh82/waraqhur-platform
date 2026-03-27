"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface StartDirectMessageButtonProps {
  targetUserId: string;
  label?: string;
  className?: string;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    defaultLabel: "مراسلة خاصة",
    opening: "جارٍ فتح المحادثة...",
    failed: "تعذر بدء المحادثة.",
  },
  en: {
    defaultLabel: "Direct Message",
    opening: "Opening conversation...",
    failed: "Failed to start conversation.",
  },
} as const;

export function StartDirectMessageButton({
  targetUserId,
  label,
  className = "btn",
  locale = "ar",
}: StartDirectMessageButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = copy[locale];
  const finalLabel = label ?? t.defaultLabel;

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
      setError(payload?.error?.message ?? t.failed);
      return;
    }

    startTransition(() => {
      router.replace(`/messages/${payload.data.thread.id}`);
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
        {isPending ? t.opening : finalLabel}
      </button>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
