"use client";

import { useState } from "react";
import { CommentForm } from "@/components/social/comment-form";

interface ReplyToggleButtonProps {
  postId: string;
  commentId: string;
}

export function ReplyToggleButton({ postId, commentId }: ReplyToggleButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="reply-toggle">
      <button
        type="button"
        className="tweet-card__action"
        onClick={() => setShowForm(!showForm)}
      >
        <span className="tweet-card__action-icon">↩️</span>
        <span>رد</span>
      </button>
      {showForm ? (
        <div style={{ marginTop: "10px", width: "100%" }}>
          <CommentForm
            postId={postId}
            parentId={commentId}
            placeholder="اكتب ردك هنا..."
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
