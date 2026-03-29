/* eslint-disable react-hooks/error-boundaries */
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationsManager } from "@/components/dashboard/notifications-manager";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import {
  listNotificationsForUser,
} from "@/services/notification-service";

interface NotificationsPageItemPayload {
  event?: string | null;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface NotificationsPageItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  payload?: NotificationsPageItemPayload | null;
}

function toPayload(input: unknown): NotificationsPageItemPayload | null {
  if (!input || typeof input !== "object") return null;
  const payload = input as Record<string, unknown>;

  return {
    event: typeof payload.event === "string" ? payload.event : null,
    actionUrl: typeof payload.actionUrl === "string" ? payload.actionUrl : null,
    entityType: typeof payload.entityType === "string" ? payload.entityType : null,
    entityId: typeof payload.entityId === "string" ? payload.entityId : null,
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? (payload.metadata as Record<string, unknown>)
        : null,
  };
}

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionValue) {
    redirect("/login?next=%2Fnotifications");
  }

  let userId = "";
  try {
    const current = await getCurrentUserFromSession(sessionValue);
    userId = current.user.id;
  } catch {
    redirect("/login?next=%2Fnotifications");
  }

  const notifications = await listNotificationsForUser(userId);

  const initialItems: NotificationsPageItem[] = notifications.map((n) => ({
    id: n.id,
    type: n.payload?.event ?? "system.announcement",
    title: n.title,
    body: n.body,
    readAt: n.readAt,
    createdAt: n.createdAt,
    payload: toPayload(n.payload),
  }));

  return (
    <AppShell>
      <section className="page-section" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/timeline" className="btn small">
            {locale === "en" ? "Home" : "الصفحة الرئيسية"}
          </Link>
          <Link href="/notifications" className="btn small">
            {locale === "en" ? "Notifications" : "الإشعارات"}
          </Link>
        </div>

        <section className="dashboard-panel" style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0 }}>
            {locale === "en" ? "Notifications" : "الإشعارات"}
          </h1>
          <NotificationsManager locale={locale} initialItems={initialItems} />
        </section>
      </section>
    </AppShell>
  );
}
