import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationsManager } from "@/components/dashboard/notifications-manager";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import {
  listNotificationsForUser,
  markAllNotificationsAsRead,
} from "@/services/notification-service";

interface NotificationsPageItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    redirect("/login?next=%2Fnotifications");
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const notifications = await listNotificationsForUser(current.user.id);

    const hasUnread = notifications.some((item) => !item.readAt);
    let readAtFromAutoRead: string | null = null;

    if (hasUnread) {
      const result = await markAllNotificationsAsRead(current.user.id);
      readAtFromAutoRead = result.readAt;
    }

    const initialItems: NotificationsPageItem[] = notifications.map((item) => ({
      id: item.id,
      type: item.payload?.event ?? item.channel,
      title: item.title,
      body: item.body,
      readAt: item.readAt ?? readAtFromAutoRead,
      createdAt: item.createdAt,
    }));

    return (
      <AppShell>
        <section className="page-section" style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0 }}>
            {locale === "en" ? "Notifications" : "الإشعارات"}
          </h1>
          <NotificationsManager locale={locale} initialItems={initialItems} />
        </section>
      </AppShell>
    );
  } catch {
    redirect("/login?next=%2Fnotifications");
  }
}
