"use client";

import { useState } from "react";
import Link from "next/link";
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
  canComment?: boolean;
}

const copy = {
  ar: {
    replyPlaceholder: "\u0627\u0643\u062a\u0628 \u0631\u062f\u0643...",
    replySend: "\u0631\u062f",
    replyFailed: "\u062a\u0639\u0630\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u062f.",
    unknownUser: "\u0645\u0633\u062a\u062e\u062f\u0645 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641",
    openMainReply: "\u0625\u0636\u0627\u0641\u0629 \u0631\u062f",
    closeMainReply: "\u0625\u062e\u0641\u0627\u0621",
    commentsLocked: "\u0627\u0644\u062a\u0639\u0644\u064a\u0642\u0627\u062a \u0645\u0642\u0641\u0644\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u062a\u063a\u0631\u064a\u062f\u0629.",
    replyTo: "\u0631\u062f \u0639\u0644\u0649",
    showReplies: "\u0639\u0631\u0636 \u0627\u0644\u0631\u062f\u0648\u062f",
    hideReplies: "\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0631\u062f\u0648\u062f",
  },
  en: {
    replyPlaceholder: "Post your reply...",
    replySend: "Reply",
    replyFailed: "Failed to add reply.",
    unknownUser: "Unknown user",
    openMainReply: "Add Reply",
    closeMainReply: "Hide",
    commentsLocked: "Comments are locked for this post.",
    replyTo: "Replying to",
    showReplies: "Show replies",
    hideReplies: "Hide replies",
  },
} as const;

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return diff + "s";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}

function ReplyForm({
  postId,
  parentId,
  replyingToUsername,
  onSuccess,
  onCancel,
  locale,
}: {
  postId: string;
  parentId: string | null;
  replyingToUsername?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
  locale: "ar" | "en";
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const t = copy[locale];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedContent = content.trim();
    if (!trimmedContent || sending) return;

    setSending(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, parentId, content: trimmedContent }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.replyFailed);
        return;
      }
      setContent("");
      onSuccess();
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "flex-start",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ flex: 1, display: "grid", gap: "4px" }}>
        {replyingToUsername ? (
          <span style={{ fontSize: "13px", color: "#1d9bf0" }}>
            {t.replyTo} @{replyingToUsername}
          </span>
        ) : null}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder={t.replyPlaceholder}
          disabled={sending}
          style={{
            width: "100%",
            borderRadius: "0",
            border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            padding: "8px 0",
            fontSize: "15px",
            color: "#e7e9ea",
            resize: "none",
            outline: "none",
          }}
        />
        {error ? (
          <p style={{ margin: 0, color: "#f4212e", fontSize: "13px" }}>{error}</p>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "6px", paddingTop: "4px" }}>
        <button
          type="submit"
          disabled={sending || !content.trim()}
          style={{
            border: "none",
            borderRadius: "999px",
            background: content.trim() ? "#1d9bf0" : "rgba(29,155,240,0.5)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "14px",
            padding: "6px 16px",
            cursor: content.trim() && !sending ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          {t.replySend}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "999px",
              background: "transparent",
              color: "#71767b",
              fontSize: "14px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {"×"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M1.751 10c0-4.42 3.58-8 8-8h4.5c4.42 0 8 3.58 8 8s-3.58 8-8 8h-1.14l-4.2 3.71a.75.75 0 01-1.26-.56V18.2A8.01 8.01 0 011.751 10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v12M12 3l4 4M12 3L8 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const [showReplies, setShowReplies] = useState(depth < 2);
  const canDelete = Boolean(currentUserId && comment.author?.id === currentUserId);
  const t = copy[locale];
  const hasReplies = comment.replies.length > 0;
  const indent = Math.min(depth * 32, 96);

  return (
    <div style={{ marginInlineStart: depth > 0 ? indent + "px" : "0" }}>
      <article
        style={{
          padding: "12px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "grid",
          gap: "4px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link
            href={comment.author ? "/u/" + comment.author.username : "#"}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              background: comment.author?.avatarUrl ? "transparent" : "linear-gradient(135deg, #1d4ed8, #38bdf8)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "13px",
              flexShrink: 0,
              overflow: "hidden",
              textDecoration: "none",
            }}
          >
            {comment.author?.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "999px" }}
              />
            ) : (
              (comment.author?.username ?? "?").charAt(0).toUpperCase()
            )}
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, overflow: "hidden" }}>
            <Link
              href={comment.author ? "/u/" + comment.author.username : "#"}
              style={{ fontWeight: 700, fontSize: "14px", color: "#e7e9ea", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              {comment.author?.displayName ?? t.unknownUser}
            </Link>
            <span style={{ color: "#71767b", fontSize: "14px", whiteSpace: "nowrap" }}>
              @{comment.author?.username ?? "unknown"}
            </span>
            <span style={{ color: "#71767b", fontSize: "14px" }}>{"·"}</span>
            <span style={{ color: "#71767b", fontSize: "14px", whiteSpace: "nowrap" }}>
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
        </div>

        {/* Content */}
        <p dir="auto" style={{ margin: "0 0 0 40px", color: "#e7e9ea", fontSize: "15px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {comment.content}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "16px", marginInlineStart: "40px", alignItems: "center", paddingTop: "4px" }}>
          <button
            type="button"
            onClick={() => setShowReplyForm((v) => !v)}
            style={{ border: 0, background: "transparent", color: "#71767b", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: 0, fontSize: "13px" }}
          >
            <CommentIcon />
            {hasReplies ? <span>{comment.replies.length}</span> : null}
          </button>

          <LikeCommentButton
            commentId={comment.id}
            initialLikesCount={comment.likesCount}
            initialIsLiked={comment.isLikedByCurrentUser}
          />

          <button
            type="button"
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              if (navigator.share && url) navigator.share({ url }).catch(() => {});
              else if (navigator.clipboard && url) navigator.clipboard.writeText(url).catch(() => {});
            }}
            style={{ border: 0, background: "transparent", color: "#71767b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
          >
            <ShareSmallIcon />
          </button>

          {canDelete ? (
            <CommentOwnerControls commentId={comment.id} onDeleted={onRefresh} locale={locale} />
          ) : null}
        </div>

        {/* Reply form */}
        {showReplyForm ? (
          <div style={{ marginInlineStart: "40px" }}>
            <ReplyForm
              postId={comment.postId}
              parentId={comment.id}
              replyingToUsername={comment.author?.username}
              onSuccess={() => { setShowReplyForm(false); onRefresh(); }}
              onCancel={() => setShowReplyForm(false)}
              locale={locale}
            />
          </div>
        ) : null}
      </article>

      {/* Nested replies */}
      {hasReplies ? (
        <div>
          {!showReplies && depth >= 2 ? (
            <button
              type="button"
              onClick={() => setShowReplies(true)}
              style={{ border: 0, background: "transparent", color: "#1d9bf0", cursor: "pointer", fontSize: "13px", padding: "8px 0 8px 40px" }}
            >
              {t.showReplies} ({comment.replies.length})
            </button>
          ) : null}
          {showReplies ? (
            <>
              {depth >= 2 ? (
                <button
                  type="button"
                  onClick={() => setShowReplies(false)}
                  style={{ border: 0, background: "transparent", color: "#1d9bf0", cursor: "pointer", fontSize: "13px", padding: "4px 0 4px 40px" }}
                >
                  {t.hideReplies}
                </button>
              ) : null}
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
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ThreadedComments({
  postId,
  initialComments,
  currentUserId = null,
  locale = "ar",
  canComment = true,
}: ThreadedCommentsProps) {
  const [comments, setComments] = useState<CommentNode[]>(initialComments);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showMainReplyForm, setShowMainReplyForm] = useState(true);
  const t = copy[locale];

  async function refreshComments() {
    const response = await fetch("/api/posts/" + postId + "/thread", {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;
    setComments(payload.data.comments);
    setRefreshKey((v) => v + 1);
  }

  if (!canComment) {
    return (
      <div style={{ padding: "14px 0", color: "#71767b", fontSize: "15px" }}>
        {t.commentsLocked}
      </div>
    );
  }

  return (
    <div>
      {showMainReplyForm ? (
        <ReplyForm
          key={refreshKey}
          postId={postId}
          parentId={null}
          onSuccess={refreshComments}
          locale={locale}
        />
      ) : null}

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
