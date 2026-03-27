"use client";

import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setError(null);

    const response = await fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });

    const payload = await response.json().catch(() => null);

    if (response.status === 401) {
      const next = encodeURIComponent(pathname || "/timeline");
      router.push(`/login?next=${next}`);
      return;
    }

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر بدء المحادثة.");
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
