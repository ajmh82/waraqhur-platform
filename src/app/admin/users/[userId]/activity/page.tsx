import Link from "next/link";
import { notFound } from "next/navigation";
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
      lastActivityAt: string | null;
    }>;
  };
}

interface AdminAuditLogsResponse {
  data: {
    auditLogs: Array<{
      id: string;
      action: string;
      actorType: string;
      actorUserId: string | null;
      targetType: string;
      targetId: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>;
  };
}

interface AdminUserActivityPageResult {
  user: AdminUsersResponse["data"]["users"][number] | null;
  auditLogs: AdminAuditLogsResponse["data"]["auditLogs"];
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminUserActivityPageData(
  userId: string
): Promise<AdminUserActivityPageResult> {
  try {
    const [usersResponse, auditLogsResponse] = await Promise.all([
      dashboardApiGet<AdminUsersResponse>("/api/admin/users"),
      dashboardApiGet<AdminAuditLogsResponse>("/api/admin/audit-logs"),
    ]);

    const users = Array.isArray(usersResponse.data.users)
      ? usersResponse.data.users
      : [];
    const allLogs = Array.isArray(auditLogsResponse.data.auditLogs)
      ? auditLogsResponse.data.auditLogs
      : [];

    const user = users.find((item) => item.id === userId) ?? null;

    if (!user) {
      return {
        user: null,
        auditLogs: [],
        error: null,
      };
    }

    const auditLogs = allLogs.filter((log) => log.targetId === user.id);

    return {
      user,
      auditLogs,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      auditLogs: [],
      error:
        error instanceof Error ? error.message : "Unable to load user activity.",
    };
  }
}

function buildFilterHref(
  userId: string,
  targetType: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (targetType !== "ALL") {
    params.set("targetType", targetType);
  }

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
    ? `/admin/users/${userId}/activity?${queryString}`
    : `/admin/users/${userId}/activity`;
}

function getSortedAuditLogs(
  auditLogs: AdminAuditLogsResponse["data"]["auditLogs"],
  sort: SortKey
) {
  const nextLogs = [...auditLogs];

  nextLogs.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextLogs;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "الأقدم أولاً" : "الأحدث أولاً";
}

export default async function AdminUserActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{
    q?: string;
    targetType?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { userId } = await params;
  const { user, auditLogs, error } = await loadAdminUserActivityPageData(userId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedTargetType = currentSearchParams.targetType?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل سجل النشاط" description={error} />;
  }

  if (!user) {
    notFound();
  }

  const targetTypes = Array.from(new Set(auditLogs.map((log) => log.targetType))).sort();

  const filteredAuditLogs = auditLogs.filter((log) => {
    const targetTypeMatches =
      selectedTargetType === "ALL" || log.targetType === selectedTargetType;

    const queryMatches =
      normalizedQuery.length === 0 ||
      log.action.toLowerCase().includes(normalizedQuery);

    return targetTypeMatches && queryMatches;
  });

  const sortedAuditLogs = getSortedAuditLogs(filteredAuditLogs, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedAuditLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedAuditLogs = sortedAuditLogs.slice(startIndex, endIndex);
  const visibleFrom = sortedAuditLogs.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedAuditLogs.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`سجل نشاط المستخدم: ${user.profile?.displayName ?? user.username}`}
        description="عرض السجل الإداري المرتبط بهذا المستخدم."
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
          <strong>إجمالي السجلات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{auditLogs.length}</p>
        </div>
        <div className="state-card">
          <strong>السجلات الظاهرة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sortedAuditLogs.length}</p>
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
        <Link href={`/admin/users/${user.id}/roles`} className="btn small">
          أدوار المستخدم
        </Link>
        <Link href={`/admin/users/${user.id}/permissions`} className="btn small">
          صلاحيات المستخدم
        </Link>
        <Link href={`/admin/users/${user.id}/sessions`} className="btn small">
          الجلسات
        </Link>
      </div>

      <form
        action={`/admin/users/${user.id}/activity`}
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedTargetType !== "ALL" ? (
          <input type="hidden" name="targetType" value={selectedTargetType} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="اSearch داخل action"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(user.id, selectedTargetType, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(user.id, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedTargetType === "ALL" ? "primary" : "small"}`}
        >
          جميع الأهداف
        </Link>

        {targetTypes.map((targetType) => (
          <Link
            key={targetType}
            href={buildFilterHref(user.id, targetType, query, selectedSort, 1)}
            className={`btn ${selectedTargetType === targetType ? "primary" : "small"}`}
          >
            {targetType}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(user.id, selectedTargetType, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildFilterHref(user.id, selectedTargetType, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
        </Link>
      </div>

      

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>عرض:</strong> {visibleFrom}-{visibleTo} of {sortedAuditLogs.length}
        </p>
      </div>

      {paginatedAuditLogs.length === 0 ? (
        <EmptyState
          title="لا توجد سجلات"
          description="لا توجد سجلات تطابق الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الإجراء</th>
                  <th>نوع المنفّذ</th>
                  <th>نوع الهدف</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>{log.actorType}</td>
                    <td>{log.targetType}</td>
                    <td>{formatDateTimeInMakkah(log.createdAt, "ar-BH")}</td>
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
                selectedTargetType,
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
                selectedTargetType,
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
