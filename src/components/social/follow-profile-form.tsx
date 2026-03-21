"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface FollowProfileFormProps {
  userId: string;
  isFollowing: boolean;
}

export function FollowProfileForm({
  userId,
  isFollowing,
}: FollowProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit() {
    const response = await fetch(`/api/users/${userId}/follow`, {
      method: isFollowing ? "DELETE" : "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn primary"
      onClick={handleSubmit}
      disabled={isPending}
    >
      {isPending
        ? "جارٍ التنفيذ..."
        : isFollowing
          ? "إلغاء المتابعة"
          : "متابعة"}
    </button>
  );
}
