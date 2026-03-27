"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface MessageThreadFormProps {
  threadId: string;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    placeholder: "اكتب رسالتك...",
    send: "إرسال",
    sending: "جارٍ الإرسال...",
    required: "نص الرسالة مطلوب.",
    failed: "تعذر إرسال الرسالة.",
  },
  en: {
    placeholder: "Write your message...",
    send: "Send",
    sending: "Sending...",
    required: "Message text is required.",
    failed: "Failed to send message.",
  },
} as const;

export function MessageThreadForm({
  threadId,
  locale = "ar",
}: MessageThreadFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = copy[locale];

  async function submitMessage() {
    setError(null);

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError(t.required);
      return;
    }

    const response = await fetch(`/api/messages/${threadId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmedBody }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.failed);
      return;
    }

    setBody("");
    startTransition(() => router.refresh());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      await submitMessage();
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder={t.placeholder}
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,23,42,0.32)",
          padding: "12px 14px",
        }}
      />

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn-action" disabled={isPending}>
          {isPending ? t.sending : t.send}
        </button>
      </div>
    </form>
  );
}
