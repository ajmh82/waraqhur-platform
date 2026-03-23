import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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

interface AdminAuditLogsPageResult {
  data: AdminAuditLogsResponse["data"] | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminAuditLogsPageData(): Promise<AdminAuditLogsPageResult> {
  try {
    const response = await dashboardApiGet<AdminAuditLogsResponse>(
      "/api/admin/audit-logs"
    );
    return { data: response.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unable to load audit logs.",
    };
  }
}

function buildFilterHref(
  actorType: string,
  targetType: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (actorType !== "ALL") {
    params.set("actorType", actorType);
  }

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
  return queryString ? `/admin/audit-logs?${queryString}` : "/admin/audit-logs";
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
  return sort === "oldest" ? "Oldest First" : "Newest First";
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    actorType?: string;
    targetType?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminAuditLogsPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedActorType = currentSearchParams.actorType?.trim() ?? "ALL";
  const selectedTargetType = currentSearchParams.targetType?.trim() ?? "ALL";
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load audit logs"
        description={error ?? "Unable to load audit logs."}
      />
    );
  }

  const totalLogs = data.auditLogs.length;
  const userActorLogs = data.auditLogs.filter((log) => log.actorType === "USER").length;
  const postTargetLogs = data.auditLogs.filter((log) => log.targetType === "POST").length;
  const commentTargetLogs = data.auditLogs.filter((log) => log.targetType === "COMMENT").length;

  const actorTypes = Array.from(new Set(data.auditLogs.map((log) => log.actorType))).sort();
  const targetTypes = Array.from(new Set(data.auditLogs.map((log) => log.targetType))).sort();

  const filteredAuditLogs = data.auditLogs.filter((log) => {
    const actorTypeMatches =
      selectedActorType === "ALL" || log.actorType === selectedActorType;

    const targetTypeMatches =
      selectedTargetType === "ALL" || log.targetType === selectedTargetType;

    const queryMatches =
      normalizedQuery.length === 0 ||
      log.action.toLowerCase().includes(normalizedQuery) ||
      (log.targetId ?? "").toLowerCase().includes(normalizedQuery) ||
      (log.actorUserId ?? "").toLowerCase().includes(normalizedQuery);

    return actorTypeMatches && targetTypeMatches && queryMatches;
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
        title="Audit Logs"
        description="مراجعة السجل الإداري الكامل مع الفلاتر والبحث والترتيب."
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
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalLogs}</p>
        </div>
        <div className="state-card">
          <strong>USER Actors</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{userActorLogs}</p>
        </div>
        <div className="state-card">
          <strong>POST Targets</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{postTargetLogs}</p>
        </div>
        <div className="state-card">
          <strong>COMMENT Targets</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{commentTargetLogs}</p>
        </div>
      </div>

      <form
        action="/admin/audit-logs"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedActorType !== "ALL" ? (
          <input type="hidden" name="actorType" value={selectedActorType} />
        ) : null}

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
          placeholder="ابحث داخل action أو targetId أو actorUserId"
          className="search-input"
          style={{ minWidth: "360px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedActorType, selectedTargetType, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", selectedTargetType, query, selectedSort, 1)}
          className={`btn ${selectedActorType === "ALL" ? "primary" : "small"}`}
        >
          All Actor Types
        </Link>

        {actorTypes.map((actorType) => (
          <Link
            key={actorType}
            href={buildFilterHref(actorType, selectedTargetType, query, selectedSort, 1)}
            className={`btn ${selectedActorType === actorType ? "primary" : "small"}`}
          >
            {actorType}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedActorType, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedTargetType === "ALL" ? "primary" : "small"}`}
        >
          All Target Types
        </Link>

        {targetTypes.map((targetType) => (
          <Link
            key={targetType}
            href={buildFilterHref(selectedActorType, targetType, query, selectedSort, 1)}
            className={`btn ${selectedTargetType === targetType ? "primary" : "small"}`}
          >
            {targetType}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedActorType, selectedTargetType, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedActorType, selectedTargetType, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> actorType={selectedActorType}, targetType={selectedTargetType}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedAuditLogs.length}
        </p>
      </div>

      {paginatedAuditLogs.length === 0 ? (
        <EmptyState
          title="لا توجد سجلات"
          description="لا توجد سجلات تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor Type</th>
                  <th>Actor User</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>{log.actorType}</td>
                    <td>{log.actorUserId ?? "-"}</td>
                    <td>{log.targetType}</td>
                    <td>{log.targetId ?? "-"}</td>
                    <td>{new Date(log.createdAt).toLocaleString("ar-BH")}</td>
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
                selectedActorType,
                selectedTargetType,
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
                selectedActorType,
                selectedTargetType,
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
