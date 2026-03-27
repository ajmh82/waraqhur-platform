import { AppShell } from "@/components/layout/app-shell";
import { MessagesInbox } from "@/components/messages/messages-inbox";
import { MessageRequestComposer } from "@/components/messages/message-request-composer";
import { MessageRequestsPanel } from "@/components/messages/message-requests-panel";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { cookies } from "next/headers";

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
        <section className="page-section">
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
        <MessageRequestComposer locale={locale} />
        <MessageRequestsPanel locale={locale} />
        <MessagesInbox locale={locale} threads={data.threads ?? []} />
      </section>
    </AppShell>
  );
}
