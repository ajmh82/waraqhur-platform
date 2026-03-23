import Link from "next/link";
import { AdminIngestAllSourcesButton } from "@/components/admin/admin-ingest-all-sources-button";
import { AdminSourceArchiveButton } from "@/components/admin/admin-source-archive-button";
import { AdminSourceIngestButton } from "@/components/admin/admin-source-ingest-button";
import { AdminSourcePreviewButton } from "@/components/admin/admin-source-preview-button";
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
    postsCount: number;
    lastIngestedAt: string | null;
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

type SortKey = "newest" | "oldest" | "recently-ingested";

const PAGE_SIZE = 10;

async function loadAdminSourcesPageData(): Promise<AdminSourcesPageResult> {
  try {
    const data = await dashboardApiGet<AdminSourcesData>("/api/sources");
    return { data, error: null };
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
  hasPostsOnly: boolean,
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

  if (hasPostsOnly) {
    params.set("hasPosts", "1");
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

  if (sort === "oldest") {
    nextSources.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return nextSources;
  }

  if (sort === "recently-ingested") {
    nextSources.sort((a, b) => {
      const aTime = a.lastIngestedAt ? new Date(a.lastIngestedAt).getTime() : 0;
      const bTime = b.lastIngestedAt ? new Date(b.lastIngestedAt).getTime() : 0;
      return bTime - aTime;
    });
    return nextSources;
  }

  nextSources.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return nextSources;
}

function getSortLabel(sort: SortKey) {
  if (sort === "oldest") {
    return "Oldest First";
  }

  if (sort === "recently-ingested") {
    return "Recently Ingested";
  }

  return "Newest First";
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    hasPosts?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminSourcesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedType = currentSearchParams.type?.trim() ?? "ALL";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const hasPostsOnly = currentSearchParams.hasPosts === "1";
  const selectedSort =
    (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
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
  const activeSources = data.sources.filter((source) => source.status === "ACTIVE").length;
  const archivedSources = data.sources.filter((source) => source.status === "ARCHIVED").length;
  const sourcesWithPosts = data.sources.filter((source) => source.postsCount > 0).length;
  const ingestedSources = data.sources.filter((source) => source.lastIngestedAt !== null).length;

  const types = Array.from(new Set(data.sources.map((source) => source.type))).sort();
  const statuses = Array.from(new Set(data.sources.map((source) => source.status))).sort();

  const filteredSources = data.sources.filter((source) => {
    const typeMatches = selectedType === "ALL" || source.type === selectedType;
    const statusMatches = selectedStatus === "ALL" || source.status === selectedStatus;
    const postsMatches = !hasPostsOnly || source.postsCount > 0;
    const queryMatches =
      normalizedQuery.length === 0 ||
      source.name.toLowerCase().includes(normalizedQuery) ||
      source.slug.toLowerCase().includes(normalizedQuery) ||
      (source.handle ?? "").toLowerCase().includes(normalizedQuery) ||
      source.category.name.toLowerCase().includes(normalizedQuery);

    return typeMatches && statusMatches && postsMatches && queryMatches;
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
        description="إدارة جميع المصادر مع مؤشرات تشغيلية وأدوات مراقبة مباشرة."
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
          Source New
        </Link>
        <AdminIngestAllSourcesButton />
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
        <div className="state-card">
          <strong>لها منشورات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sourcesWithPosts}</p>
        </div>
        <div className="state-card">
          <strong>تم ingest لها</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{ingestedSources}</p>
        </div>
      </div>

      <form
        action="/admin/sources"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedType !== "ALL" ? (
          <input type="hidden" name="type" value={selectedType} />
        ) : null}

        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        {hasPostsOnly ? (
          <input type="hidden" name="hasPosts" value="1" />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو slug أو handle أو التصنيف"
          className="search-input"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedType, selectedStatus, hasPostsOnly, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", selectedStatus, hasPostsOnly, query, selectedSort, 1)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>

        {types.map((type) => (
          <Link
            key={type}
            href={buildFilterHref(type, selectedStatus, hasPostsOnly, query, selectedSort, 1)}
            className={`btn ${selectedType === type ? "primary" : "small"}`}
          >
            {type}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedType, "ALL", hasPostsOnly, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(selectedType, status, hasPostsOnly, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, false, query, selectedSort, 1)}
          className={`btn ${!hasPostsOnly ? "primary" : "small"}`}
        >
          All Sources
        </Link>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, true, query, selectedSort, 1)}
          className={`btn ${hasPostsOnly ? "primary" : "small"}`}
        >
          Has Posts Only
        </Link>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, hasPostsOnly, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, hasPostsOnly, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
        <Link
          href={buildFilterHref(selectedType, selectedStatus, hasPostsOnly, query, "recently-ingested", 1)}
          className={`btn ${selectedSort === "recently-ingested" ? "primary" : "small"}`}
        >
          Recently Ingested
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> type={selectedType}, status={selectedStatus}, hasPostsOnly={hasPostsOnly ? "yes" : "no"}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
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
                  <th>Type</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Posts</th>
                  <th>Last Ingested</th>
                  <th>Details</th>
                  <th>Preview</th>
                  <th>Ingest</th>
                  <th>Archive</th>
                  <th>Restore</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSources.map((source) => (
                  <tr key={source.id}>
                    <td>{source.name}</td>
                    <td>{source.type}</td>
                    <td>{source.category.name}</td>
                    <td>{source.status}</td>
                    <td>{source.postsCount}</td>
                    <td>
                      {source.lastIngestedAt
                        ? new Date(source.lastIngestedAt).toLocaleString("ar-BH")
                        : "-"}
                    </td>
                    <td>
                      <Link href={`/admin/sources/${source.id}`} className="btn small">
                        Source Details
                      </Link>
                    </td>
                    <td>
                      <AdminSourcePreviewButton sourceId={source.id} />
                    </td>
                    <td>
                      <AdminSourceIngestButton sourceId={source.id} />
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
                hasPostsOnly,
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
                hasPostsOnly,
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
