"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface RepostPostButtonProps {
  postId: string;
}

export function RepostPostButton({ postId }: RepostPostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reposted, setReposted] = useState(false);

  async function handleToggleRepost() {
    const response = await fetch(`/api/posts/${postId}/repost`, {
      method: reposted ? "DELETE" : "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      return;
    }

    setReposted(!reposted);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn small"
      onClick={handleToggleRepost}
      disabled={isPending}
    >
      {isPending ? "..." : reposted ? "إلغاء إعادة النشر" : "إعادة نشر"}
    </button>
  );
}
