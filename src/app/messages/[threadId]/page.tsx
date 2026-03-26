import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatDateTimeInMakkah } from "@/lib/date-time";
import { normalizeUiLocale, uiCopy, type UiLocale } from "@/lib/ui-copy";
import { apiGet } from "@/lib/web-api";
import { MessageThreadForm } from "@/components/messages/message-thread-form";

interface ThreadResponse {
  thread: {
    id: string;
    otherUser: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      readAt: string | null;
      isMine: boolean;
      sender: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
    }>;
  };
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

async function loadData(threadId: string) {
  try {
    return {
      data: await apiGet<ThreadResponse>(`/api/messages/${threadId}`),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تحميل المحادثة.",
    };
  }
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const [locale, { data, error }] = await Promise.all([getLocale(), loadData(threadId)]);
  const copy = uiCopy[locale];

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={locale === "en" ? "Unable to load conversation" : "تعذر تحميل المحادثة"}
            description={error ?? (locale === "en" ? "Unable to load conversation." : "تعذر تحميل المحادثة.")}
          />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="page-section">
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <Link href="/messages" className="btn small">
            {copy.backToMessages}
          </Link>
          <Link href={`/u/${data.thread.otherUser.username}`} className="btn small">
            {copy.openPublicProfile}
          </Link>
        </div>

        <div
          className="state-card"
          style={{
            maxWidth: "100%",
            margin: "0 0 18px",
            display: "flex",
            gap: "14px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div className="tweet-card__avatar">
            {data.thread.otherUser.avatarUrl ? (
              <img
                src={data.thread.otherUser.avatarUrl}
                alt={data.thread.otherUser.username}
                className="account-menu__avatar-image"
              />
            ) : (
              getInitial(data.thread.otherUser.displayName)
            )}
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <strong>{data.thread.otherUser.displayName}</strong>
            <span style={{ color: "var(--muted)", fontSize: "14px" }}>
              @{data.thread.otherUser.username}
            </span>
          </div>
        </div>

        <SectionHeading
          eyebrow={copy.messagesEyebrow}
          title={data.thread.otherUser.displayName}
          description={`@${data.thread.otherUser.username}`}
        />

        {data.thread.messages.length === 0 ? (
          <EmptyState
            title={copy.noMessagesYet}
            description={locale === "en" ? "Start this conversation by sending the first message." : "ابدأ هذه المحادثة الآن عبر إرسال أول رسالة."}
          />
        ) : (
          <div className="dashboard-list" style={{ marginBottom: "18px" }}>
            {data.thread.messages.map((message) => (
              <article
                key={message.id}
                className="dashboard-card"
                style={{
                  marginInlineStart: message.isMine ? "auto" : 0,
                  marginInlineEnd: message.isMine ? 0 : "auto",
                  maxWidth: "80%",
                  background: message.isMine
                    ? "rgba(34, 199, 255, 0.08)"
                    : undefined,
                }}
              >
                <strong>{message.sender.displayName}</strong>
                <p style={{ margin: "10px 0 0" }}>{message.body}</p>
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    alignItems: "center",
                    color: "var(--muted)",
                    fontSize: "13px",
                  }}
                >
                  <span>
                    {formatDateTimeInMakkah(
                      message.createdAt,
                      locale === "en" ? "en-GB" : "ar-BH"
                    )}
                  </span>
                  {message.isMine ? (
                    <span>
                      {message.readAt ? copy.readStatus : copy.sentStatus}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <MessageThreadForm threadId={data.thread.id} />
      </section>
    </AppShell>
  );
}
