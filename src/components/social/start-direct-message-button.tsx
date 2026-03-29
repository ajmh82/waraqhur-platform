"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface StartDirectMessageButtonProps {
  targetUserId: string;
  label?: string;
  className?: string;
  locale?: string;
}

export function StartDirectMessageButton({
  targetUserId,
  label,
  className = "btn",
  locale = "ar",
}: StartDirectMessageButtonProps) {
  const isArabic = locale !== "en";
  const resolvedLabel = label ?? (isArabic ? "مراسلة خاصة" : "Direct Message");
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setError(null);
    setNotice(null);

    const response = await fetch("/api/messages/requests", {
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
      const code = payload?.error?.code;
      if (code === "DM_CLOSED") {
        setError(
          isArabic
            ? "هذا المستخدم أغلق الرسائل الخاصة."
            : "This user has disabled private messages."
        );
        return;
      }
      setError(
        payload?.error?.message ??
          (isArabic ? "تعذر إرسال طلب المحادثة." : "Failed to send chat request.")
      );
      return;
    }

    const mode = payload?.data?.mode;
    const threadId = payload?.data?.thread?.id;

    if (mode === "thread_exists" && threadId) {
      startTransition(() => {
        router.replace(`/messages/${threadId}`);
      });
      return;
    }

    setNotice(
      isArabic
        ? "تم إرسال طلب المحادثة. بانتظار قبول الطرف الآخر."
        : "Chat request sent. Waiting for recipient approval."
    );
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button type="button" className={className} onClick={handleClick} disabled={isPending}>
        {isPending
          ? (isArabic ? "جارٍ الإرسال..." : "Sending...")
          : resolvedLabel}
      </button>

      {notice ? (
        <p style={{ margin: 0, color: "#86efac", fontSize: "14px" }}>
          {notice}
        </p>
      ) : null}

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
