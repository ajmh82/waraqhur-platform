"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MessageThreadBlockControlsProps {
  targetUserId: string;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    block: "حظر",
    unblock: "فك الحظر",
    blocking: "جارٍ التنفيذ...",
    failed: "تعذر تحديث حالة البلوك.",
    confirmBlock: "هل تريد حظر هذا المستخدم؟",
    confirmUnblock: "هل تريد فك الحظر عن هذا المستخدم؟",
  },
  en: {
    block: "Block",
    unblock: "Unblock",
    blocking: "Processing...",
    failed: "Failed to update block status.",
    confirmBlock: "Do you want to block this user?",
    confirmUnblock: "Do you want to unblock this user?",
  },
} as const;

export function MessageThreadBlockControls({
  targetUserId,
  locale = "ar",
}: MessageThreadBlockControlsProps) {
  const t = copy[locale];
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadState() {
    try {
      setError(null);
      const res = await fetch("/api/users/blocks", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      const list = Array.isArray(payload?.data?.blockedUsers) ? payload.data.blockedUsers : [];
      const found = list.some((row: { userId?: string }) => row?.userId === targetUserId);
      setIsBlocked(found);
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlock() {
    if (pending) return;

    const ok = isBlocked ? window.confirm(t.confirmUnblock) : window.confirm(t.confirmBlock);
    if (!ok) return;

    setPending(true);
    setError(null);

    try {
      if (isBlocked) {
        const res = await fetch(`/api/users/blocks/${targetUserId}`, {
          method: "DELETE",
          credentials: "include",
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.success) {
          setError(payload?.error?.message ?? t.failed);
          return;
        }
        setIsBlocked(false);
        router.refresh();
        return;
      }

      const res = await fetch("/api/users/blocks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedUserId: targetUserId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.failed);
        return;
      }

      setIsBlocked(true);
      alert(
        locale === "en"
          ? "User has been blocked. They can no longer send you new messages."
          : "تم حظر المستخدم. لن تصلك منه رسائل جديدة."
      );
      router.push("/messages");
    } catch {
      setError(t.failed);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    loadState();
  }, [targetUserId]);

  return (
    <div style={{ display: "grid", gap: "6px", marginInlineStart: "auto" }}>
      <button type="button" className="btn small" disabled={loading || pending} onClick={toggleBlock}>
        {pending ? t.blocking : isBlocked ? t.unblock : t.block}
      </button>
      {error ? <span style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</span> : null}
    </div>
  );
}
