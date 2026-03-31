"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FollowUserButton } from "@/components/social/follow-user-button";

interface ProfileActionsProps {
  targetUserId: string;
  locale?: "ar" | "en";
  initialIsFollowing?: boolean;
}

const copy = {
  ar: {
    block: "حظر",
    unblock: "فك الحظر",
    pending: "جارٍ التنفيذ...",
    confirmBlock: "هل تريد حظر هذا الحساب؟",
    confirmUnblock: "هل تريد فك الحظر عن هذا الحساب؟",
  },
  en: {
    block: "Block",
    unblock: "Unblock",
    pending: "Processing...",
    confirmBlock: "Block this account?",
    confirmUnblock: "Unblock this account?",
  },
} as const;

export function ProfileActions({
  targetUserId,
  locale = "ar",
  initialIsFollowing = false,
}: ProfileActionsProps) {
  const router = useRouter();
  const t = copy[locale];
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadBlockedState() {
      try {
        const res = await fetch("/api/users/blocks", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.success || !active) return;
        const list = Array.isArray(payload?.data?.blockedUsers) ? payload.data.blockedUsers : [];
        const found = list.some((row: { userId?: string }) => row?.userId === targetUserId);
        setBlockedByMe(found);
      } catch {
        // silent
      }
    }
    void loadBlockedState();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  async function toggleBlock() {
    if (pending) return;
    const confirmed = window.confirm(blockedByMe ? t.confirmUnblock : t.confirmBlock);
    if (!confirmed) return;

    setPending(true);
    try {
      if (blockedByMe) {
        const res = await fetch(`/api/users/blocks/${targetUserId}`, {
          method: "DELETE",
          credentials: "include",
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.success) return;
        setBlockedByMe(false);
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
      if (!res.ok || !payload?.success) return;
      setBlockedByMe(true);
      router.push("/timeline");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {!blockedByMe ? (
        <FollowUserButton
          userId={targetUserId}
          initialIsFollowing={initialIsFollowing}
          locale={locale}
        />
      ) : null}
      <button
        type="button"
        className="btn small"
        disabled={pending}
        onClick={toggleBlock}
        style={{ borderColor: "rgba(248,113,113,0.35)", color: "#fecaca" }}
      >
        {pending ? t.pending : blockedByMe ? t.unblock : t.block}
      </button>
    </div>
  );
}
