import Link from "next/link";
import { AdminSourceArchiveButton } from "@/components/admin/admin-source-archive-button";
import { AdminSourceRestoreButton } from "@/components/admin/admin-source-restore-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourcesData {
  sources: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    url: string | null;
    handle: string | null;
    createdAt: string;
    updatedAt: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

interface AdminSourcesPageResult {
  data: AdminSourcesData | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminSourcesPageData(): Promise<AdminSourcesPageResult> {
  try {
    const data = await dashboardApiGet<AdminSourcesData>("/api/sources");

    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load sources.",
    };
  }
}

function buildFilterHref(
  type: string,
  status: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (type !== "ALL") {
    params.set("type", type);
  }

  if (status !== "ALL") {
    params.set("status", status);
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
  return queryString ? `/admin/sources?${queryString}` : "/admin/sources";
}

function getSortedSources(
  sources: AdminSourcesData["sources"],
  sort: SortKey
) {
  const nextSources = [...sources];

  nextSources.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextSources;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "Oldest First" : "Newest First";
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminSourcesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedType = currentSearchParams.type?.trim() ?? "ALL";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load sources"
        description={error ?? "Unable to load sources."}
      />
    );
  }

  const totalSources = data.sources.length;
  const activeSources = data.sources.filter(
    (source) => source.status === "ACTIVE"
  ).length;
  const archivedSources = data.sources.filter(
    (source) => source.status === "ARCHIVED"
  ).length;

  const types = Array.from(new Set(data.sources.map((source) => source.type))).sort();
  const statuses = Array.from(
    new Set(data.sources.map((source) => source.status))
  ).sort();

  const filteredSources = data.sources.filter((source) => {
    const typeMatches = selectedType === "ALL" || source.type === selectedType;
    const statusMatches =
      selectedStatus === "ALL" || source.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      source.name.toLowerCase().includes(normalizedQuery) ||
      source.slug.toLowerCase().includes(normalizedQuery) ||
      source.category.name.toLowerCase().includes(normalizedQuery) ||
      (source.handle ?? "").toLowerCase().includes(normalizedQuery) ||
      (source.url ?? "").toLowerCase().includes(normalizedQuery);

    return typeMatches && statusMatches && queryMatches;
  });

  const sortedSources = getSortedSources(filteredSources, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedSources.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedSources = sortedSources.slice(startIndex, endIndex);
  const visibleFrom = sortedSources.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedSources.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Sources management"
        description="إدارة جميع المصادر من داخل لوحة الإدارة."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/sources/new" className="btn primary">
          New Source
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>إجمالي المصادر</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalSources}</p>
        </div>
        <div className="state-card">
          <strong>المصادر النشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeSources}</p>
        </div>
        <div className="state-card">
          <strong>المصادر المؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedSources}</p>
        </div>
      </div>

      <form
        action="/admin/sources"
        method="GET"
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {selectedType !== "ALL" ? (
          <input type="hidden" name="type" value={selectedType} />
        ) : null}

        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو slug أو التصنيف أو الرابط"
          className="search-input"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedType, selectedStatus, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref("ALL", selectedStatus, query, selectedSort, 1)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>

        {types.map((type) => (
          <Link
            key={type}
            href={buildFilterHref(type, selectedStatus, query, selectedSort, 1)}
            className={`btn ${selectedType === type ? "primary" : "small"}`}
          >
            {type}
          </Link>
        ))}
      </div>

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedType, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(selectedType, status, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedType, selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> type={selectedType}, status={selectedStatus}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedSources.length}
        </p>
      </div>

      {paginatedSources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر"
          description="لا توجد مصادر تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Handle</th>
                  <th>URL</th>
                  <th>Created</th>
                  <th>Details</th>
                  <th>Edit</th>
                  <th>Archive</th>
                  <th>Restore</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSources.map((source) => (
                  <tr key={source.id}>
                    <td>{source.name}</td>
                    <td>{source.slug}</td>
                    <td>{source.type}</td>
                    <td>{source.status}</td>
                    <td>{source.category.name}</td>
                    <td>{source.handle ?? "-"}</td>
                    <td>{source.url ?? "-"}</td>
                    <td>{new Date(source.createdAt).toLocaleString("ar-BH")}</td>
                    <td>
                      <Link href={`/admin/sources/${source.id}`} className="btn small">
                        Source Details
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/sources/${source.id}/edit`} className="btn small">
                        Edit Source
                      </Link>
                    </td>
                    <td>
                      <AdminSourceArchiveButton
                        sourceId={source.id}
                        status={source.status}
                      />
                    </td>
                    <td>
                      <AdminSourceRestoreButton
                        sourceId={source.id}
                        status={source.status}
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
                selectedType,
                selectedStatus,
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
                selectedType,
                selectedStatus,
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
