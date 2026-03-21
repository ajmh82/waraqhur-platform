"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LikePostButtonProps {
  postId: string;
  initialLikesCount: number;
}

export function LikePostButton({
  postId,
  initialLikesCount,
}: LikePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);

  async function handleToggleLike() {
    const nextMethod = liked ? "DELETE" : "POST";

    const response = await fetch(`/api/posts/${postId}/like`, {
      method: nextMethod,
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      return;
    }

    setLiked(payload.data.liked);
    setLikesCount(payload.data.likesCount);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn small"
      onClick={handleToggleLike}
      disabled={isPending}
    >
      {isPending ? "..." : liked ? `إلغاء الإعجاب (${likesCount})` : `إعجاب (${likesCount})`}
    </button>
  );
}
