import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminSourceRecord {
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
}

interface AdminCategorySourcesPageResult {
  category: AdminCategoryRecord | null;
  sources: AdminSourceRecord[];
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminCategorySourcesPageData(
  categoryId: string
): Promise<AdminCategorySourcesPageResult> {
  try {
    const [categoriesData, sourcesData] = await Promise.all([
      dashboardApiGet<{ categories: AdminCategoryRecord[] }>("/api/categories"),
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
    ]);

    const category =
      categoriesData.categories.find((item) => item.id === categoryId) ?? null;

    if (!category) {
      return {
        category: null,
        sources: [],
        error: null,
      };
    }

    const sources = sourcesData.sources.filter(
      (source) => source.category.id === category.id
    );

    return {
      category,
      sources,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      sources: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل مصادر التصنيف.",
    };
  }
}

function buildFilterHref(
  categoryId: string,
  status: string,
  type: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (type !== "ALL") {
    params.set("type", type);
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
    ? `/admin/categories/${categoryId}/sources?${queryString}`
    : `/admin/categories/${categoryId}/sources`;
}

function getSortedSources(
  sources: AdminSourceRecord[],
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

export default async function AdminCategorySourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ q?: string; status?: string; type?: string; sort?: string; page?: string }>;
}) {
  const { categoryId } = await params;
  const { category, sources, error } =
    await loadAdminCategorySourcesPageData(categoryId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedType = currentSearchParams.type?.trim() ?? "ALL";
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل مصادر التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  const statuses = Array.from(new Set(sources.map((source) => source.status))).sort();
  const types = Array.from(new Set(sources.map((source) => source.type))).sort();
  const totalSources = sources.length;
  const activeSources = sources.filter((source) => source.status === "ACTIVE").length;
  const archivedSources = sources.filter((source) => source.status === "ARCHIVED").length;

  const filteredSources = sources.filter((source) => {
    const statusMatches =
      selectedStatus === "ALL" || source.status === selectedStatus;

    const typeMatches =
      selectedType === "ALL" || source.type === selectedType;

    const queryMatches =
      normalizedQuery.length === 0 ||
      source.name.toLowerCase().includes(normalizedQuery) ||
      source.slug.toLowerCase().includes(normalizedQuery) ||
      (source.handle ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatches && typeMatches && queryMatches;
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
        title={`مصادر التصنيف: ${category.name}`}
        description="عرض جميع المصادر المرتبطة بهذا التصنيف."
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
          <strong>إجمالي المصادر</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalSources}</p>
        </div>
        <div className="state-card">
          <strong>Active</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeSources}</p>
        </div>
        <div className="state-card">
          <strong>Archived</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedSources}</p>
        </div>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/categories/${category.id}`} className="btn small">
          العودة إلى تفاصيل التصنيف
        </Link>
      </div>

      <form
        action={`/admin/categories/${category.id}/sources`}
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        {selectedType !== "ALL" ? (
          <input type="hidden" name="type" value={selectedType} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو slug أو handle"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(category.id, selectedStatus, selectedType, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, "ALL", selectedType, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(category.id, status, selectedType, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, selectedStatus, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>

        {types.map((type) => (
          <Link
            key={type}
            href={buildFilterHref(category.id, selectedStatus, type, query, selectedSort, 1)}
            className={`btn ${selectedType === type ? "primary" : "small"}`}
          >
            {type}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, selectedStatus, selectedType, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(category.id, selectedStatus, selectedType, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> category={category.name}, status={selectedStatus}, type={selectedType}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedSources.length}
        </p>
      </div>

      {paginatedSources.length === 0 ? (
        <EmptyState
          title="لا توجد مصادر مطابقة"
          description="لا توجد مصادر تطابق البحث الحالي أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>Slug</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>Handle</th>
                  <th>الرابط</th>
                  <th>التاريخ</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSources.map((source) => (
                  <tr key={source.id}>
                    <td>{source.name}</td>
                    <td>{source.slug}</td>
                    <td>{source.type}</td>
                    <td>{source.status}</td>
                    <td>{source.handle ?? "-"}</td>
                    <td>{source.url ?? "-"}</td>
                    <td>{formatDateTimeInMakkah(source.createdAt, "ar-BH")}</td>
                    <td>
                      <Link href={`/admin/sources/${source.id}`} className="btn small">
                        Source Details
                      </Link>
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
                category.id,
                selectedStatus,
                selectedType,
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
                category.id,
                selectedStatus,
                selectedType,
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
