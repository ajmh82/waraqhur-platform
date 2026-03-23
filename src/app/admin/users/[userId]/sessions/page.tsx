import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserSessionRevokeButton } from "@/components/admin/admin-user-session-revoke-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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
    const user = response.data.users.find((item) => item.id === userId) ?? null;

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
    return "Oldest First";
  }

  if (sort === "last-used") {
    return "Last Used";
  }

  return "Newest First";
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
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="Failed to load user sessions" description={error} />;
  }

  if (!user) {
    notFound();
  }

  const filteredSessions = user.sessions.filter((session) =>
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
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{user.sessions.length}</p>
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
          User Activity
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
          placeholder="ابحث داخل Session ID"
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
          Newest First
        </Link>
        <Link
          href={buildFilterHref(user.id, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
        <Link
          href={buildFilterHref(user.id, query, "last-used", 1)}
          className={`btn ${selectedSort === "last-used" ? "primary" : "small"}`}
        >
          Last Used
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> search={query || "none"}, sort={getSortLabel(selectedSort)}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedSessions.length}
        </p>
      </div>

      {paginatedSessions.length === 0 ? (
        <EmptyState
          title="لا توجد جلسات"
          description="لا توجد جلسات تطابق البحث الحالي."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Created At</th>
                  <th>Last Used At</th>
                  <th>Expires At</th>
                  <th>Revoke</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.id}</td>
                    <td>{new Date(session.createdAt).toLocaleString("ar-BH")}</td>
                    <td>{new Date(session.lastUsedAt).toLocaleString("ar-BH")}</td>
                    <td>{new Date(session.expiresAt).toLocaleString("ar-BH")}</td>
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
              Previous
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
              Next
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
