/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { MessagesInbox } from "@/components/messages/messages-inbox";
import { MessageRequestComposer } from "@/components/messages/message-request-composer";
import { MessageRequestsPanel } from "@/components/messages/message-requests-panel";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

interface MessagesPageData {
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

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let canViewAuditPage = false;

  if (sessionValue) {
    try {
      const current = await getCurrentUserFromSession(sessionValue);
      canViewAuditPage = current.user.username === "sayed";
    } catch {
      canViewAuditPage = false;
    }
  }

  let data: MessagesPageData | null = null;
  let error: string | null = null;

  try {
    data = await apiGet<MessagesPageData>("/api/messages");
  } catch (requestError) {
    error =
      requestError instanceof Error
        ? requestError.message
        : locale === "en"
          ? "Failed to load conversations."
          : "تعذر تحميل المحادثات.";
  }

  if (!data || error) {
    return (
      <AppShell>
        <section className="page-section" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href="/messages/groups/new"
              className="btn-action"
              style={{ width: "fit-content" }}
            >
              {locale === "en" ? "Create Group" : "إنشاء مجموعة"}
            </a>

            {canViewAuditPage ? (
              <Link href="/audit/messages" className="btn small">
                {locale === "en" ? "Messages Audit" : "مراقبة الرسائل"}
              </Link>
            ) : null}
          </div>

          <ErrorState
            title={locale === "en" ? "Failed to load messages" : "تعذر تحميل الرسائل"}
            description={
              error ?? (locale === "en" ? "Failed to load conversations." : "تعذر تحميل المحادثات.")
            }
          />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="page-section" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/timeline" className="btn small">
            {locale === "en" ? "Home" : "الصفحة الرئيسية"}
          </Link>
          <Link href="/messages" className="btn small">
            {locale === "en" ? "Messages" : "الرسائل الخاصة"}
          </Link>
          {canViewAuditPage ? (
            <Link href="/audit/messages" className="btn small">
              {locale === "en" ? "Messages Audit" : "مراقبة الرسائل"}
            </Link>
          ) : null}
        </div>

        <MessageRequestComposer locale={locale} />
        <MessageRequestsPanel locale={locale} />
        <MessagesInbox locale={locale} threads={data.threads ?? []} />
      </section>
    </AppShell>
  );
}
