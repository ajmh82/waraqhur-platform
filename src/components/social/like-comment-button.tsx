"use client";

import { useState } from "react";

interface LikeCommentButtonProps {
  commentId: string;
  initialLikesCount: number;
  initialIsLiked: boolean;
}

export function LikeCommentButton({
  commentId,
  initialLikesCount,
  initialIsLiked,
}: LikeCommentButtonProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);

  async function handleClick() {
    const response = await fetch(`/api/comments/${commentId}/like`, {
      method: isLiked ? "DELETE" : "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      return;
    }

    setIsLiked(payload.data.liked);
    setLikesCount(payload.data.likesCount);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        minWidth: "46px",
        minHeight: "46px",
        padding: "0 12px",
        border: 0,
        borderRadius: "999px",
        background: isLiked
          ? "rgba(244, 63, 94, 0.14)"
          : "rgba(255,255,255,0.05)",
        color: isLiked ? "#ff8ea1" : "rgba(255,255,255,0.84)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: "pointer",
        boxShadow: isLiked
          ? "inset 0 0 0 1px rgba(244,63,94,0.16)"
          : "inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <span style={{ fontSize: "16px", lineHeight: 1 }}>❤️</span>
      <span style={{ fontSize: "13px", fontWeight: 800 }}>{likesCount}</span>
    </button>
  );
}
