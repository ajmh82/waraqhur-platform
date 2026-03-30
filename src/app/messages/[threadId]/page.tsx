import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { MessageThreadForm } from "@/components/messages/message-thread-form";
import { MessageThreadView } from "@/components/messages/message-thread-view";
import { apiGet } from "@/lib/web-api";

interface MessageThreadPageData {
  thread: {
    id: string;
    otherUser: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    isBlocked: boolean;
    messages: Array<{
      id: string;
      body: string;
      contentType?: string;
      mediaUrl?: string | null;
      mediaMimeType?: string | null;
      mediaSizeBytes?: number | null;
      createdAt: string;
      readAt?: string | null;
      senderUserId: string;
      sender?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      replyTo?: {
        id: string;
        senderUserId: string;
        senderDisplayName: string;
        previewText: string;
      } | null;
    }>;
  };
  currentUserId: string;
}

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  let data: MessageThreadPageData | null = null;

  try {
    data = await apiGet<MessageThreadPageData>(`/api/messages/${threadId}`);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <style>{`
        @media (max-width: 900px) {
          .app-header,
          .app-header--neo {
            display: none !important;
          }
          .page-stack {
            padding-top: 0 !important;
          }
        }
      `}</style>

      <section className="page-section" style={{ paddingTop: 0 }}>
        <MessageThreadView
          threadId={data.thread.id}
          locale={locale}
          currentUserId={data.currentUserId}
          otherUser={data.thread.otherUser}
          messages={data.thread.messages}
          composer={
            <MessageThreadForm
              threadId={data.thread.id}
              locale={locale}
              isBlocked={data.thread.isBlocked}
            />
          }
        />
      </section>
    </AppShell>
  );
}
