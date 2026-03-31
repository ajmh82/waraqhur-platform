import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { AppShell } from "@/components/layout/app-shell";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasPermission } from "@/services/authorization-service";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/date-time";
import { AuditMessagesFilters } from "@/components/messages/audit-messages-filters";

type SortValue = "latest" | "oldest" | "user_asc" | "user_desc";
type StatusValue = "all" | "unread" | "read";

function normalizeSort(value: string | undefined): SortValue {
  if (value === "oldest") return "oldest";
  if (value === "user_asc") return "user_asc";
  if (value === "user_desc") return "user_desc";
  return "latest";
}

function normalizeStatus(value: string | undefined): StatusValue {
  if (value === "unread") return "unread";
  if (value === "read") return "read";
  return "all";
}

function isValidAuditKey(input: string, expected: string): boolean {
  if (!input || !expected) return false;
  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async function AuditMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; status?: string; key?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const params = await searchParams;
  const incomingKey = (params.key ?? "").trim();

  const expectedKey = process.env.AUDIT_MESSAGES_KEY?.trim() ?? "";
  if (!isValidAuditKey(incomingKey, expectedKey)) {
    notFound();
  }

  if (!sessionValue) {
    notFound();
  }

  let currentUserId = "";
  try {
    const current = await getCurrentUserFromSession(sessionValue);
    currentUserId = current.user.id;
  } catch {
    notFound();
  }

  const canReadAll = await userHasPermission(currentUserId, "messages.read_all");
  if (!canReadAll) {
    notFound();
  }

  const q = (params.q ?? "").trim();
  const sort = normalizeSort(params.sort);
  const status = normalizeStatus(params.status);

  const whereFilters: Array<Record<string, unknown>> = [];

  if (q.length > 0) {
    whereFilters.push({
      OR: [
        { participantA: { username: { contains: q, mode: "insensitive" } } },
        { participantB: { username: { contains: q, mode: "insensitive" } } },
        { participantA: { profile: { displayName: { contains: q, mode: "insensitive" } } } },
        { participantB: { profile: { displayName: { contains: q, mode: "insensitive" } } } },
        { messages: { some: { body: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (status === "unread") {
    whereFilters.push({
      messages: {
        some: { readAt: null },
      },
    });
  } else if (status === "read") {
    whereFilters.push({
      messages: {
        some: {},
        none: { readAt: null },
      },
    });
  }

  const threads = await prisma.directThread.findMany({
    where: whereFilters.length > 0 ? { AND: whereFilters } : undefined,
    orderBy: sort === "oldest" ? { updatedAt: "asc" } : { updatedAt: "desc" },
    include: {
      participantA: { include: { profile: true } },
      participantB: { include: { profile: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (sort === "user_asc" || sort === "user_desc") {
    threads.sort((a, b) => {
      const left = `${a.participantA.username}-${a.participantB.username}`.toLowerCase();
      const right = `${b.participantA.username}-${b.participantB.username}`.toLowerCase();
      const cmp = left.localeCompare(right, "en");
      return sort === "user_asc" ? cmp : -cmp;
    });
  }

  return (
    <AppShell>
      <section className="page-section" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: "22px" }}>
          {locale === "en" ? "Messages Audit" : "مراقبة الرسائل الخاصة"}
        </h1>

        <p style={{ margin: 0, color: "var(--muted)" }}>
          {locale === "en"
            ? "This page is visible only to authorized accounts."
            : "هذه الصفحة متاحة فقط للحسابات المخوّلة."}
        </p>

        <AuditMessagesFilters locale={locale} resultsCount={threads.length} />

        <div className="state-card" style={{ display: "grid", gap: 10 }}>
          {threads.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {locale === "en" ? "No conversations found." : "لا توجد محادثات مطابقة."}
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
