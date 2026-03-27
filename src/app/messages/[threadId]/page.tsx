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
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      senderUserId: string;
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
      <section className="page-section">
        <MessageThreadView
          threadId={data.thread.id}
          locale={locale}
          currentUserId={data.currentUserId}
          otherUser={data.thread.otherUser}
          messages={data.thread.messages}
          composer={<MessageThreadForm threadId={data.thread.id} locale={locale} />}
        />
      </section>
    </AppShell>
  );
}
