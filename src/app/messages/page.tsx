import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatDateTimeInMakkah } from "@/lib/date-time";
import { normalizeUiLocale, uiCopy, type UiLocale } from "@/lib/ui-copy";
import { apiGet } from "@/lib/web-api";

interface ThreadsResponse {
  threads: Array<{
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
  }>;
}

interface CurrentUserLocaleData {
  user: {
    profile: {
      locale: string | null;
    } | null;
  };
}

async function getLocale(): Promise<UiLocale> {
  try {
    const currentUser = await apiGet<CurrentUserLocaleData>("/api/auth/me");
    return normalizeUiLocale(currentUser.user.profile?.locale);
  } catch {
    return "ar";
  }
}

async function loadData() {
  try {
    return {
      data: await apiGet<ThreadsResponse>("/api/messages"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل المحادثات.",
    };
  }
}

function truncateMessage(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export default async function MessagesPage() {
  const [locale, { data, error }] = await Promise.all([getLocale(), loadData()]);
  const copy = uiCopy[locale];

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={locale === "en" ? "Unable to load messages" : "تعذر تحميل الرسائل"}
            description={error ?? (locale === "en" ? "Unable to load conversations." : "تعذر تحميل المحادثات.")}
          />
        </section>
      </AppShell>
    );
  }

  const totalUnread = data.threads.reduce(
    (sum, thread) => sum + thread.unreadCount,
    0
  );

  return (
    <AppShell>
      <section className="page-section">
        <SectionHeading
          eyebrow={copy.messagesEyebrow}
          title={copy.messagesTitle}
          description={copy.messagesDescription}
        />

        <div
          className="state-card"
          style={{
            maxWidth: "100%",
            margin: "0 0 18px",
            display: "grid",
            gap: "8px",
          }}
        >
          <strong>{copy.messagesSummary}</strong>
          <p style={{ margin: 0 }}>
            {copy.messagesSummaryText
              .replace("{unread}", String(totalUnread))
              .replace("{count}", String(data.threads.length))}
          </p>
        </div>

        {data.threads.length === 0 ? (
          <EmptyState
            title={copy.noConversationsTitle}
            description={copy.noConversationsDescription}
          />
        ) : (
          <div className="dashboard-list">
            {data.threads.map((thread) => (
              <article key={thread.id} className="dashboard-card">
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <div className="tweet-card__avatar">
                        {thread.otherUser.avatarUrl ? (
                          <img
                            src={thread.otherUser.avatarUrl}
                            alt={thread.otherUser.username}
                            className="account-menu__avatar-image"
                          />
                        ) : (
                          getInitial(thread.otherUser.displayName)
                        )}
                      </div>

                      <div style={{ display: "grid", gap: "6px" }}>
                        <strong>{thread.otherUser.displayName}</strong>
                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: "14px",
                          }}
                        >
                          @{thread.otherUser.username}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--muted)",
                          fontSize: "13px",
                        }}
                      >
                        {formatDateTimeInMakkah(
                          thread.updatedAt,
                          locale === "en" ? "en-GB" : "ar-BH"
                        )}
                      </span>

                      {thread.unreadCount > 0 ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "34px",
                            minHeight: "34px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "rgba(34, 199, 255, 0.16)",
                            color: "#d5f3ff",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <strong style={{ fontSize: "14px" }}>{copy.lastMessage}</strong>
                    <p style={{ margin: 0, color: "var(--muted)" }}>
                      {thread.lastMessage
                        ? truncateMessage(thread.lastMessage.body, 140)
                        : copy.noMessagesYet}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Link href={`/messages/${thread.id}`} className="btn small">
                      {copy.openConversation}
                    </Link>
                    <Link
                      href={`/u/${thread.otherUser.username}`}
                      className="btn small"
                    >
                      {copy.publicProfile}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
