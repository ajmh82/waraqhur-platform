"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  placeholder?: string;
  onCancel?: () => void;
}

export function CommentForm({
  postId,
  parentId = null,
  placeholder = "اكتب تعليقك هنا...",
  onCancel,
}: CommentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setError(null);

    const response = await fetch("/api/comments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        parentId: parentId || null,
        content: trimmed,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر إرسال التعليق. تأكد من تسجيل الدخول.");
      return;
    }

    setContent("");
    startTransition(() => {
      router.refresh();
    });

    if (onCancel) onCancel();
  }

  return (
    <div className="comment-form">
      <textarea
        className="comment-form__input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        disabled={isPending}
      />
      {error ? <p className="comment-form__error">{error}</p> : null}
      <div className="comment-form__actions">
        <button
          type="button"
          className="btn-action"
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
        >
          {isPending ? "جارٍ الإرسال..." : parentId ? "إرسال الرد" : "إرسال التعليق"}
        </button>
        {onCancel ? (
          <button type="button" className="btn-action" onClick={onCancel} disabled={isPending}>
            إلغاء
          </button>
        ) : null}
        <span className="comment-form__counter">{content.length}/2000</span>
      </div>
    </div>
  );
}
