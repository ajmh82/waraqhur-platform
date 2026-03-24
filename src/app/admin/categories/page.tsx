import Link from "next/link";
import { AdminCategoryArchiveButton } from "@/components/admin/admin-category-archive-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminCategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface AdminCategoriesPageResult {
  data: AdminCategoriesResponse | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminCategoriesPageData(): Promise<AdminCategoriesPageResult> {
  try {
    const data = await dashboardApiGet<AdminCategoriesResponse>("/api/categories");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل التصنيفات.",
    };
  }
}

function buildFilterHref(
  status: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

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
  return queryString ? `/admin/categories?${queryString}` : "/admin/categories";
}

function getSortedCategories(
  categories: AdminCategoriesResponse["categories"],
  sort: SortKey
) {
  const nextCategories = [...categories];

  nextCategories.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextCategories;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "Oldest First" : "Newest First";
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const { data, error } = await loadAdminCategoriesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل التصنيفات"
        description={error ?? "تعذر تحميل التصنيفات."}
      />
    );
  }

  const statuses = Array.from(
    new Set(data.categories.map((category) => category.status))
  ).sort();

  const totalCategories = data.categories.length;
  const activeCategories = data.categories.filter(
    (category) => category.status === "ACTIVE"
  ).length;
  const archivedCategories = data.categories.filter(
    (category) => category.status === "ARCHIVED"
  ).length;

  const filteredCategories = data.categories.filter((category) => {
    const statusMatches =
      selectedStatus === "ALL" || category.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      category.name.toLowerCase().includes(normalizedQuery) ||
      category.slug.toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

  const sortedCategories = getSortedCategories(filteredCategories, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedCategories = sortedCategories.slice(startIndex, endIndex);
  const visibleFrom = sortedCategories.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedCategories.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="إدارة التصنيفات"
        description="عرض جميع التصنيفات وإدارتها من داخل لوحة الإدارة."
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
          <strong>إجمالي التصنيفات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalCategories}</p>
        </div>
        <div className="state-card">
          <strong>التصنيفات النشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeCategories}</p>
        </div>
        <div className="state-card">
          <strong>التصنيفات المؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedCategories}</p>
        </div>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories/new" className="btn primary">
          تصنيف جديد
        </Link>
      </div>

      <form
        action="/admin/categories"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
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
          placeholder="ابحث بالاسم أو slug"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedStatus, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(status, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> status={selectedStatus}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedCategories.length}
        </p>
      </div>

      {paginatedCategories.length === 0 ? (
        <EmptyState
          title="لا توجد تصنيفات مطابقة"
          description="لا توجد تصنيفات تطابق البحث الحالي أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>Slug</th>
                  <th>الحالة</th>
                  <th>الترتيب</th>
                  <th>الوصف</th>
                  <th>تاريخ الإنشاء</th>
                  <th>Details</th>
                  <th>Edit</th>
                  <th>Archive</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.status}</td>
                    <td>{category.sortOrder}</td>
                    <td>{category.description ?? "-"}</td>
                    <td>{formatDateTimeInMakkah(category.createdAt, "ar-BH")}</td>
                    <td>
                      <Link href={`/admin/categories/${category.id}`} className="btn small">
                        Category Details
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/categories/${category.id}/edit`} className="btn small">
                        Edit Category
                      </Link>
                    </td>
                    <td>
                      <AdminCategoryArchiveButton
                        categoryId={category.id}
                        status={category.status}
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
