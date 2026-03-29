"use client";

import { useState } from "react";

interface FollowUserButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    follow: "متابعة",
    unfollow: "إلغاء المتابعة",
    loading: "...",
  },
  en: {
    follow: "Follow",
    unfollow: "Unfollow",
    loading: "...",
  },
} as const;

export function FollowUserButton({
  userId,
  initialIsFollowing,
  locale = "ar",
}: FollowUserButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, setIsPending] = useState(false);
  const t = copy[locale];

  async function handleClick() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        credentials: "include",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        return;
      }

      setIsFollowing(Boolean(payload?.data?.isFollowing));
    } finally {
      setIsPending(false);
    }
  }

  const following = isFollowing;

  return (
    <button data-follow-button="true" type="button"
      onClick={handleClick}
      disabled={isPending}
      style={{
        minWidth: "112px",
        height: "40px",
        padding: "0 16px",
        borderRadius: "999px",
        border: following
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(14,165,233,0.28)",
        background: following
          ? "rgba(255,255,255,0.05)"
          : "linear-gradient(135deg, #f8fdff 0%, #dff4ff 100%)",
        color: following ? "rgba(255,255,255,0.88)" : "#0f172a",
        fontSize: "14px",
        fontWeight: 800,
        letterSpacing: "0.01em",
        boxShadow: following
          ? "none"
          : "0 10px 24px rgba(14, 165, 233, 0.16)",
        cursor: isPending ? "default" : "pointer",
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease",
      }}
      onMouseEnter={(event) => {
        if (isPending) {
          return;
        }

        event.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {isPending ? t.loading : following ? t.unfollow : t.follow}
    </button>
  );
}
