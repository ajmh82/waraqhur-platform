import Image from "next/image";
"use client";

import { useMemo } from "react";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface ThreadUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
}

interface MessageThreadViewProps {
  currentUserId: string;
  otherUser: ThreadUser;
  messages: ThreadMessage[];
  composer: React.ReactNode;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    empty: "لا توجد رسائل بعد. ابدأ أول رسالة الآن.",
  },
  en: {
    empty: "No messages yet. Send the first message now.",
  },
} as const;

export function MessageThreadView({
  currentUserId,
  otherUser,
  messages,
  composer,
  locale = "ar",
}: MessageThreadViewProps) {
  const t = copy[locale];

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      ),
    [messages]
  );

  return (
    <section
      className="state-card"
      style={{
        margin: 0,
        maxWidth: "100%",
        padding: "0",
        overflow: "hidden",
        display: "grid",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "999px",
            overflow: "hidden",
            flexShrink: 0,
            background: otherUser.avatarUrl
              ? "transparent"
              : "linear-gradient(135deg, #0ea5e9, #2563eb)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
          }}
        >
          {otherUser.avatarUrl ? (
            <img
              src={otherUser.avatarUrl}
              alt={otherUser.displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            otherUser.displayName.charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ display: "grid", gap: "4px", minWidth: 0 }}>
          <strong style={{ fontSize: "16px" }}>{otherUser.displayName}</strong>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>
            @{otherUser.username}
          </span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gap: "12px",
          padding: "18px",
          minHeight: "320px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        {sortedMessages.length === 0 ? (
          <div
            style={{
              borderRadius: "18px",
              padding: "18px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--muted)",
            }}
          >
            {t.empty}
          </div>
        ) : (
          sortedMessages.map((message) => {
            const isOwnMessage = message.senderUserId === currentUserId;

            return (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: isOwnMessage ? "flex-start" : "flex-end",
                }}
              >
                <article
                  style={{
                    maxWidth: "min(78%, 520px)",
                    display: "grid",
                    gap: "6px",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    background: isOwnMessage
                      ? "linear-gradient(135deg, rgba(14,165,233,0.22), rgba(37,99,235,0.22))"
                      : "rgba(255,255,255,0.05)",
                    border: isOwnMessage
                      ? "1px solid rgba(14,165,233,0.2)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.12)",
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                    {message.body}
                  </p>

                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {formatDateTimeInMakkah(
                      message.createdAt,
                      locale === "en" ? "en-US" : "ar-BH"
                    )}
                  </span>
                </article>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: "18px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {composer}
      </div>
    </section>
  );
}
