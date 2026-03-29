"use client";

import { useState } from "react";
import { LikeCommentButton } from "@/components/social/like-comment-button";
import { CommentOwnerControls } from "@/components/social/comment-owner-controls";

interface CommentNode {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  author: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  replies: CommentNode[];
}

interface ThreadedCommentsProps {
  postId: string;
  initialComments: CommentNode[];
  currentUserId?: string | null;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    replyPlaceholder: "اكتب ردك هنا...",
    replySend: "إرسال الرد",
    replyFailed: "تعذر إضافة الرد.",
    unknownUser: "مستخدم غير معروف",
    replyDelete: "حذف الرد",
  },
  en: {
    replyPlaceholder: "Write your reply here...",
    replySend: "Send Reply",
    replyFailed: "Failed to add reply.",
    unknownUser: "Unknown user",
    replyDelete: "Delete Reply",
  },
} as const;

function ReplyForm({
  postId,
  parentId,
  onSuccess,
  locale,
}: {
  postId: string;
  parentId: string | null;
  onSuccess: () => void;
  locale: "ar" | "en";
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = copy[locale];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    const response = await fetch("/api/comments", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        parentId,
        content: trimmedContent,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.replyFailed);
      return;
    }

    setContent("");
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "10px",
        marginTop: "10px",
        padding: "14px",
        borderRadius: "18px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder={t.replyPlaceholder}
        style={{
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,23,42,0.32)",
          padding: "12px 14px",
        }}
      />

      {error ? (
        <p dir="auto" style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>
          {error}
        </p>
      ) : null}

      <div>
        <button type="submit" className="btn small">
          {t.replySend}
        </button>
      </div>
    </form>
  );
}

function GhostActionButton({
  icon,
  count,
  onClick,
}: {
  icon: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: "46px",
        minHeight: "46px",
        padding: "0 12px",
        border: 0,
        borderRadius: "999px",
        background: "rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.84)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: "pointer",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <span style={{ fontSize: "16px", lineHeight: 1 }}>{icon}</span>
      {typeof count === "number" ? (
        <span style={{ fontSize: "13px", fontWeight: 800 }}>{count}</span>
      ) : null}
    </button>
  );
}

function CommentItem({
  comment,
  depth,
  currentUserId,
  onRefresh,
  locale,
}: {
  comment: CommentNode;
  depth: number;
  currentUserId: string | null;
  onRefresh: () => void;
  locale: "ar" | "en";
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const canDelete = Boolean(currentUserId && comment.author?.id === currentUserId);
  const t = copy[locale];

  return (
    <article id={`comment-${comment.id}`}
      style={{
        marginInlineStart: `${Math.min(depth * 24, 72)}px`,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        padding: "18px",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "999px",
            background: comment.author?.avatarUrl
              ? "transparent"
              : "linear-gradient(135deg, #1d4ed8, #38bdf8)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {comment.author?.avatarUrl ? (
            <img
              src={comment.author.avatarUrl}
              alt={comment.author.displayName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "999px",
              }}
            />
          ) : (
            (comment.author?.username ?? "؟").charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ display: "grid", gap: "4px", flex: 1 }}>
          <strong>{comment.author?.displayName ?? t.unknownUser}</strong>
          <span style={{ color: "var(--muted)", fontSize: "14px" }}>
            @{comment.author?.username ?? "unknown"}
          </span>
        </div>
      </div>

      <p dir="auto"
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          lineHeight: 1.85,
        }}
      >
        {comment.content}
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <GhostActionButton
          icon="💬"
          count={comment.replies.length}
          onClick={() => setShowReplyForm((value) => !value)}
        />

        <LikeCommentButton
          commentId={comment.id}
          initialLikesCount={comment.likesCount}
          initialIsLiked={comment.isLikedByCurrentUser}
        />

        <GhostActionButton
          icon="↗"
          onClick={() => {
            const targetUrl =
              typeof window !== "undefined" ? window.location.href : "";

            if (
              typeof navigator !== "undefined" &&
              navigator.share &&
              targetUrl
            ) {
              navigator.share({ url: targetUrl }).catch(() => undefined);
              return;
            }

            if (
              typeof navigator !== "undefined" &&
              navigator.clipboard &&
              targetUrl
            ) {
              navigator.clipboard.writeText(targetUrl).catch(() => undefined);
            }
          }}
        />

        {canDelete ? (
          <CommentOwnerControls
            commentId={comment.id}
            onDeleted={onRefresh}
            locale={locale}
          />
        ) : null}
      </div>

      {showReplyForm ? (
        <ReplyForm
          postId={comment.postId}
          parentId={comment.id}
          onSuccess={() => {
            setShowReplyForm(false);
            onRefresh();
          }}
          locale={locale}
        />
      ) : null}

      {comment.replies.length > 0 ? (
        <div style={{ display: "grid", gap: "12px" }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ThreadedComments({
  postId,
  initialComments,
  currentUserId = null,
  locale = "ar",
}: ThreadedCommentsProps) {
  const [comments, setComments] = useState<CommentNode[]>(initialComments);
  const [refreshKey, setRefreshKey] = useState(0);

  async function refreshComments() {
    const response = await fetch(`/api/posts/${postId}/thread`, {
      credentials: "include",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      return;
    }

    setComments(payload.data.comments);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <ReplyForm
        key={refreshKey}
        postId={postId}
        parentId={null}
        onSuccess={refreshComments}
        locale={locale}
      />

      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={0}
          currentUserId={currentUserId}
          onRefresh={refreshComments}
          locale={locale}
        />
      ))}
    </div>
  );
}
