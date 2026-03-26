"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LikePostButtonProps {
  postId: string;
  initialLikesCount: number;
}

interface LikeUser {
  id: string;
  username: string;
}

export function LikePostButton({ postId, initialLikesCount }: LikePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [showUsers, setShowUsers] = useState(false);
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function handleToggleLike() {
    const nextMethod = liked ? "DELETE" : "POST";
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: nextMethod,
      credentials: "include",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;

    setLiked(payload.data.liked);
    setLikesCount(payload.data.likesCount);
    setShowUsers(false);
    startTransition(() => { router.refresh(); });
  }

  async function handleShowUsers() {
    if (showUsers) {
      setShowUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "GET",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.success) {
        setLikeUsers(payload.data.users);
        setLikesCount(payload.data.likesCount);
      }
    } catch {
      // ignore
    }
    setLoadingUsers(false);
    setShowUsers(true);
  }

  return (
    <div className="like-widget">
      <div className="like-widget__row">
        <button
          type="button"
          className="btn-action"
          onClick={handleToggleLike}
          disabled={isPending}
        >
          {isPending ? "..." : liked ? "💔 إلغاء" : "❤️ إعجاب"}
        </button>
        <button
          type="button"
          className="like-widget__count"
          onClick={handleShowUsers}
          disabled={loadingUsers}
        >
          {loadingUsers ? "..." : `❤️ ${likesCount}`}
        </button>
      </div>

      {showUsers && likeUsers.length > 0 ? (
        <div className="like-widget__users">
          <p className="like-widget__users-title">أعجب بهذا المنشور:</p>
          {likeUsers.map((u) => (
            <span key={u.id} className="like-widget__user-chip">
              @{u.username}
            </span>
          ))}
        </div>
      ) : null}

      {showUsers && likeUsers.length === 0 && !loadingUsers ? (
        <div className="like-widget__users">
          <p className="like-widget__users-title">لا يوجد إعجابات بعد.</p>
        </div>
      ) : null}
    </div>
  );
}
