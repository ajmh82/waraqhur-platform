"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface BookmarkPostButtonProps {
  postId: string;
}

export function BookmarkPostButton({ postId }: BookmarkPostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookmarked, setBookmarked] = useState(false);

  async function handleToggleBookmark() {
    const nextMethod = bookmarked ? "DELETE" : "POST";

    const response = await fetch(`/api/posts/${postId}/bookmark`, {
      method: nextMethod,
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      return;
    }

    setBookmarked(payload.data.bookmarked);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn small"
      onClick={handleToggleBookmark}
      disabled={isPending}
    >
      {isPending ? "..." : bookmarked ? "إزالة الحفظ" : "حفظ"}
    </button>
  );
}
