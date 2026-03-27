import Image from "next/image";
import Link from "next/link";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface InboxThread {
  id: string;
  updatedAt: string;
  unreadCount: number;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
  } | null;
}

interface MessagesInboxProps {
  locale?: "ar" | "en";
  threads: InboxThread[];
}

const copy = {
  ar: {
    title: "الرسائل الخاصة",
    countSuffix: "محادثة",
    empty: "لا توجد محادثات بعد. ابدأ محادثة من صفحة أي مستخدم.",
    noMessages: "لا توجد رسائل بعد.",
  },
  en: {
    title: "Messages",
    countSuffix: "conversations",
    empty: "No conversations yet. Start one from any user profile.",
    noMessages: "No messages yet.",
  },
} as const;

export function MessagesInbox({
  locale = "ar",
  threads,
}: MessagesInboxProps) {
  const t = copy[locale];

  return (
    <section
      className="state-card"
      style={{
        margin: 0,
        maxWidth: "100%",
        padding: "20px",
        display: "grid",
        gap: "16px",
      }}
    >
      <div style={{ display: "grid", gap: "4px" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>{t.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {threads.length} {t.countSuffix}
        </p>
      </div>

      {threads.length === 0 ? (
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
        <div style={{ display: "grid", gap: "12px" }}>
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/messages/${thread.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "999px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: thread.otherUser.avatarUrl
                        ? "transparent"
                        : "linear-gradient(135deg, #0ea5e9, #2563eb)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                    }}
                  >
                    {thread.otherUser.avatarUrl ? (
                      <img
                        src={thread.otherUser.avatarUrl}
                        alt={thread.otherUser.displayName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      thread.otherUser.displayName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div style={{ minWidth: 0, display: "grid", gap: "4px", flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "15px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {thread.otherUser.displayName}
                      </strong>

                      <span style={{ color: "var(--muted)", fontSize: "12px", flexShrink: 0 }}>
                        {formatDateTimeInMakkah(
                          thread.updatedAt,
                          locale === "en" ? "en-US" : "ar-BH"
                        )}
                      </span>
                    </div>

                    <span
                      style={{
                        color: "var(--muted)",
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      @{thread.otherUser.username}
                    </span>

                    <span
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {thread.lastMessage?.body ?? t.noMessages}
                    </span>
                  </div>
                </div>

                {thread.unreadCount > 0 ? (
                  <div
                    style={{
                      minWidth: "28px",
                      height: "28px",
                      padding: "0 8px",
                      borderRadius: "999px",
                      background: "rgba(14,165,233,0.18)",
                      color: "#bae6fd",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "12px",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {thread.unreadCount}
                  </div>
                ) : null}
              </article>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
