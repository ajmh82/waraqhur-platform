"use client";

import { useState, useTransition } from "react";

interface CommentOwnerControlsProps {
  commentId: string;
  onDeleted: () => void;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    confirm: "هل تريد حذف هذا الرد؟ سيتم حذف الردود التابعة له أيضًا.",
    failed: "تعذر حذف الرد.",
    label: "حذف الرد",
  },
  en: {
    confirm: "Do you want to delete this reply? Its nested replies will also be deleted.",
    failed: "Failed to delete reply.",
    label: "Delete Reply",
  },
} as const;

export function CommentOwnerControls({
  commentId,
  onDeleted,
  locale = "ar",
}: CommentOwnerControlsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = copy[locale];

  async function handleDelete() {
    const confirmed = window.confirm(t.confirm);

    if (!confirmed) {
      return;
    }

    setError(null);

    const response = await fetch(`/api/comments/${commentId}/owner`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.failed);
      return;
    }

    startTransition(() => {
      onDeleted();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        style={{
          minWidth: "46px",
          minHeight: "46px",
          padding: "0 12px",
          border: 0,
          borderRadius: "999px",
          background: "rgba(248,113,113,0.12)",
          color: "#fecaca",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: "pointer",
          boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.16)",
          fontWeight: 800,
        }}
      >
        <span style={{ fontSize: "15px", lineHeight: 1 }}>🗑</span>
        <span style={{ fontSize: "13px" }}>{t.label}</span>
      </button>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "13px" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
