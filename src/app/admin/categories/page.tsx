import Link from "next/link";
import { AdminCategoryArchiveButton } from "@/components/admin/admin-category-archive-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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

function buildFilterHref(status: string, query: string) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();
  return queryString ? `/admin/categories?${queryString}` : "/admin/categories";
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { data, error } = await loadAdminCategoriesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل التصنيفات"
        description={error ?? "تعذر تحميل التصنيفات."}
      />
    );
  }

  const statuses = Array.from(new Set(data.categories.map((category) => category.status)));
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
          href={buildFilterHref(selectedStatus, "")}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", query)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(status, query)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredCategories.length === 0 ? (
        <EmptyState
          title="لا توجد تصنيفات مطابقة"
          description="لا توجد تصنيفات تطابق البحث الحالي أو الفلاتر الحالية."
        />
      ) : (
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
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>{category.status}</td>
                  <td>{category.sortOrder}</td>
                  <td>{category.description ?? "-"}</td>
                  <td>{new Date(category.createdAt).toLocaleString("ar-BH")}</td>
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
      )}
    </section>
  );
}
