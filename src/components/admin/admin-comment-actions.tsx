"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminCommentActionsProps {
  comment: {
    id: string;
    status: string;
  };
}

export function AdminCommentActions({ comment }: AdminCommentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function runRequest(
    action: "activate" | "hide" | "delete",
    request: Promise<Response>
  ) {
    setMessage(null);

    const response = await request;
    const payload = await response.json().catch(() => null);

    startTransition(() => {
      if (!response.ok || !payload?.success) {
        setMessage(payload?.error?.message ?? "تعذر تنفيذ الإجراء");
        return;
      }

      setMessage(
        action === "delete"
          ? "تم Delete التعليق"
          : action === "activate"
            ? "تم تفعيل التعليق"
            : "تم إخفاء التعليق"
      );
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      {comment.status !== "ACTIVE" ? (
        <button
          type="button"
          className="btn small"
          onClick={() =>
            runRequest(
              "activate",
              fetch(`/api/comments/${comment.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  status: "ACTIVE",
                }),
              })
            )
          }
          disabled={isPending}
        >
          {isPending ? "..." : "تفعيل"}
        </button>
      ) : null}

      {comment.status !== "HIDDEN" ? (
        <button
          type="button"
          className="btn small"
          onClick={() =>
            runRequest(
              "hide",
              fetch(`/api/comments/${comment.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  status: "HIDDEN",
                }),
              })
            )
          }
          disabled={isPending}
        >
          {isPending ? "..." : "إخفاء"}
        </button>
      ) : null}

      <button
        type="button"
        className="btn small"
        onClick={() =>
          runRequest(
            "delete",
            fetch(`/api/comments/${comment.id}`, {
              method: "DELETE",
              credentials: "include",
            })
          )
        }
        disabled={isPending}
      >
        {isPending ? "..." : "Delete"}
      </button>

      {message ? <p className="admin-actions__message">{message}</p> : null}
    </div>
  );
}
