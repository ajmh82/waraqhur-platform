"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminUserActionsProps {
  user: {
    id: string;
    email: string;
    status: string;
  };
}

async function parseResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function AdminUserActions({ user }: AdminUserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: string, request: Promise<Response>) {
    setLoading(action);
    setMessage(null);

    try {
      const response = await request;
      const payload = await parseResponse(response);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "تعذر تنفيذ الإجراء");
      }

      setMessage("تم بنجاح");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تنفيذ الإجراء");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="admin-actions">
      {user.status === "ACTIVE" ? (
        <button
          type="button"
          className="admin-action-button admin-action-button--warn"
          onClick={() =>
            runAction(
              "suspend",
              fetch("/api/admin/users/status", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: user.id,
                  status: "SUSPENDED",
                }),
              })
            )
          }
          disabled={loading !== null}
        >
          {loading === "suspend" ? "جارٍ التنفيذ..." : "إيقاف"}
        </button>
      ) : (
        <button
          type="button"
          className="admin-action-button"
          onClick={() =>
            runAction(
              "activate",
              fetch("/api/admin/users/status", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: user.id,
                  status: "ACTIVE",
                }),
              })
            )
          }
          disabled={loading !== null}
        >
          {loading === "activate" ? "جارٍ التنفيذ..." : "تفعيل"}
        </button>
      )}

      <button
        type="button"
        className="admin-action-button"
        onClick={() =>
          runAction(
            "reset",
            fetch("/api/admin/users/password-reset", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: user.email,
              }),
            })
          )
        }
        disabled={loading !== null}
      >
        {loading === "reset" ? "جارٍ التنفيذ..." : "إعادة تعيين كلمة المرور"}
      </button>

      {message ? <p className="admin-actions__message">{message}</p> : null}
    </div>
  );
}
