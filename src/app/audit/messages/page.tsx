import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/date-time";

export default async function AuditMessagesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    redirect("/login");
  }

  let currentUsername = "";
  try {
    const current = await getCurrentUserFromSession(sessionValue);
    currentUsername = current.user.username;
  } catch {
    redirect("/login");
  }

  if (currentUsername !== "sayed") {
    redirect("/messages");
  }

  const threads = await prisma.directThread.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      participantA: {
        include: { profile: true },
      },
      participantB: {
        include: { profile: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <AppShell>
      <section className="page-section" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: "22px" }}>
          {locale === "en" ? "Messages Audit" : "مراقبة الرسائل الخاصة"}
        </h1>

        <p style={{ margin: 0, color: "var(--muted)" }}>
          {locale === "en"
            ? "This page is visible only to the authorized auditor account."
            : "هذه الصفحة متاحة فقط للحساب المخوّل بمراجعة الرسائل."}
        </p>

        <div className="state-card" style={{ display: "grid", gap: 10 }}>
          {threads.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {locale === "en" ? "No conversations found." : "لا توجد محادثات حالياً."}
            </p>
          ) : (
            threads.map((thread) => {
              const aName =
                thread.participantA.profile?.displayName ?? thread.participantA.username;
              const bName =
                thread.participantB.profile?.displayName ?? thread.participantB.username;

              const lastBody =
                thread.messages[0]?.body?.trim() ||
                (locale === "en" ? "No messages yet" : "لا توجد رسائل بعد");

              const lastTime = thread.messages[0]?.createdAt
                ? formatRelativeTime(
                    thread.messages[0].createdAt.toISOString(),
                    locale === "en" ? "en-US" : "ar-BH"
                  )
                : "-";

              return (
                <Link
                  key={thread.id}
                  href={`/messages/${thread.id}`}
                  className="messages-inbox__item"
                  style={{
                    display: "grid",
                    gap: 6,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ minWidth: 0 }}>
                      @{thread.participantA.username} ({aName}) ↔ @{thread.participantB.username} ({bName})
                    </strong>
                    <time
                      style={{
                        color: "var(--muted)",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lastTime}
                    </time>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lastBody}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </AppShell>
  );
}
