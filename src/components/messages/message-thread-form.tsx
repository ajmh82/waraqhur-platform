"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface MessageThreadFormProps {
  threadId: string;
}

export function MessageThreadForm({ threadId }: MessageThreadFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    const response = await fetch(`/api/messages/${threadId}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: trimmed,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "تعذر إرسال الرسالة.");
      return;
    }

    setBody("");

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="state-card"
      style={{
        maxWidth: "100%",
        margin: 0,
        display: "grid",
        gap: "12px",
      }}
    >
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        placeholder="اكتب رسالتك هنا..."
        maxLength={2000}
      />

      {error ? (
        <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>
      ) : null}

      <div>
        <button type="submit" className="btn-action" disabled={isPending}>
          {isPending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
        </button>
      </div>
    </form>
  );
}
