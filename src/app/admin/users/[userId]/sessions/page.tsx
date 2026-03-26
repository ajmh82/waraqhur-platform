import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserSessionRevokeButton } from "@/components/admin/admin-user-session-revoke-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminUsersResponse {
  data: {
    users: Array<{
      id: string;
      email: string;
      username: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      profile: {
        displayName: string;
      } | null;
      roles: Array<{
        key: string;
        name: string;
        assignedAt: string;
      }>;
      sessions: Array<{
        id: string;
        createdAt: string;
        lastUsedAt: string;
        expiresAt: string;
      }>;
      lastActivityAt: string | null;
    }>;
  };
}

interface AdminUserSessionsPageResult {
  user: AdminUsersResponse["data"]["users"][number] | null;
  error: string | null;
}

type SortKey = "newest" | "oldest" | "last-used";

const PAGE_SIZE = 10;

async function loadAdminUserSessionsPageData(
  userId: string
): Promise<AdminUserSessionsPageResult> {
  try {
    const response = await dashboardApiGet<AdminUsersResponse>("/api/admin/users");
    const users = Array.isArray(response.data.users) ? response.data.users : [];
    const user = users.find((item) => item.id === userId) ?? null;

    return {
      user,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error:
        error instanceof Error ? error.message : "Unable to load user sessions.",
    };
  }
}

function buildFilterHref(
  userId: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  if (sort !== "newest") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/users/${userId}/sessions?${queryString}`
    : `/admin/users/${userId}/sessions`;
}

function getSortedSessions(
  sessions: AdminUsersResponse["data"]["users"][number]["sessions"],
  sort: SortKey
) {
  const nextSessions = [...sessions];

  if (sort === "oldest") {
    nextSessions.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return nextSessions;
  }

  if (sort === "last-used") {
    nextSessions.sort(
      (a, b) =>
        new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    );
    return nextSessions;
  }

  nextSessions.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return nextSessions;
}

function getSortLabel(sort: SortKey) {
  if (sort === "oldest") {
    return "الأقدم أولاً";
  }

  if (sort === "last-used") {
    return "آخر استخدام";
  }

  return "الأحدث أولاً";
}

export default async function AdminUserSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const { userId } = await params;
  const { user, error } = await loadAdminUserSessionsPageData(userId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ||
    currentSearchParams.sort?.trim() === "last-used"
      ? (currentSearchParams.sort.trim() as SortKey)
      : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل الجلسات" description={error} />;
  }

  if (!user) {
    notFound();
  }

  const sessions = Array.isArray(user.sessions) ? user.sessions : [];
  const filteredSessions = sessions.filter((session) =>
    session.id.toLowerCase().includes(normalizedQuery)
  );

  const sortedSessions = getSortedSessions(filteredSessions, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedSessions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedSessions = sortedSessions.slice(startIndex, endIndex);
  const visibleFrom = sortedSessions.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedSessions.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`جلسات المستخدم: ${user.profile?.displayName ?? user.username}`}
        description="عرض الجلسات الحالية والسابقة لهذا المستخدم."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>إجمالي الجلسات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sessions.length}</p>
        </div>
        <div className="state-card">
          <strong>الجلسات الظاهرة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sortedSessions.length}</p>
        </div>
      </div>

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href={`/admin/users/${user.id}`} className="btn small">
          العودة إلى تفاصيل المستخدم
        </Link>
        <Link href={`/admin/users/${user.id}/activity`} className="btn small">
          سجل النشاط
        </Link>
      </div>

      <form
        action={`/admin/users/${user.id}/sessions`}
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="اSearch داخل Session ID"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(user.id, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(user.id, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildFilterHref(user.id, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
        </Link>
        <Link
          href={buildFilterHref(user.id, query, "last-used", 1)}
          className={`btn ${selectedSort === "last-used" ? "primary" : "small"}`}
        >
          آخر استخدام
        </Link>
      </div>

      

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>عرض:</strong> {visibleFrom}-{visibleTo} of {sortedSessions.length}
        </p>
      </div>

      {paginatedSessions.length === 0 ? (
        <EmptyState
          title="لا توجد جلسات"
          description="لا توجد جلسات تطابق الSearch الحالي."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>معرّف الجلسة</th>
                  <th>تاريخ الإنشاء</th>
                  <th>آخر استخدام At</th>
                  <th>تنتهي في</th>
                  <th>إلغاء</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.id}</td>
                    <td>{formatDateTimeInMakkah(session.createdAt, "ar-BH")}</td>
                    <td>{formatDateTimeInMakkah(session.lastUsedAt, "ar-BH")}</td>
                    <td>{formatDateTimeInMakkah(session.expiresAt, "ar-BH")}</td>
                    <td>
                      <AdminUserSessionRevokeButton
                        userId={user.id}
                        sessionId={session.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={buildFilterHref(
                user.id,
                query,
                selectedSort,
                Math.max(1, safePage - 1)
              )}
              className="btn small"
              aria-disabled={safePage <= 1}
            >
              السابق
            </Link>

            <span className="btn small">
              Page {safePage} / {totalPages}
            </span>

            <Link
              href={buildFilterHref(
                user.id,
                query,
                selectedSort,
                Math.min(totalPages, safePage + 1)
              )}
              className="btn small"
              aria-disabled={safePage >= totalPages}
            >
              التالي
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
