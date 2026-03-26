import Link from "next/link";
import { AdminCategoryArchiveButton } from "@/components/admin/admin-category-archive-button";
import { AdminCategoryRestoreButton } from "@/components/admin/admin-category-restore-button";
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

async function loadData(): Promise<AdminCategoriesPageResult> {
  try {
    return {
      data: await dashboardApiGet<AdminCategoriesResponse>("/api/categories"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تحميل التصنيفات.",
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

  if (status !== "ALL") params.set("status", status);
  if (query.trim()) params.set("q", query.trim());
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/admin/categories?${qs}` : "/admin/categories";
}

function getSortedCategories(
  categories: AdminCategoriesResponse["categories"],
  sort: SortKey
) {
  const next = [...categories];

  next.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return next;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedSort = sp.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل التصنيفات"
        description={error ?? "تعذر تحميل التصنيفات."}
      />
    );
  }

  const totalCategories = data.categories.length;
  const activeCategories = data.categories.filter(
    (category) => category.status === "ACTIVE"
  ).length;
  const archivedCategories = data.categories.filter(
    (category) => category.status === "ARCHIVED"
  ).length;
  const statuses = Array.from(
    new Set(data.categories.map((category) => category.status))
  ).sort();

  const filtered = data.categories.filter((category) => {
    const statusMatch =
      selectedStatus === "ALL" || category.status === selectedStatus;
    const queryMatch =
      normalizedQuery.length === 0 ||
      category.name.toLowerCase().includes(normalizedQuery) ||
      category.slug.toLowerCase().includes(normalizedQuery) ||
      (category.description ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatch && queryMatch;
  });

  const sorted = getSortedCategories(filtered, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const visibleFrom = sorted.length === 0 ? 0 : start + 1;
  const visibleTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الإدارة"
        title="إدارة التصنيفات"
        description="مراجعة التصنيفات وتنظيمها وأرشفتها أو استعادتها من واجهة أوضح وأسهل متابعة."
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
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {totalCategories}
          </p>
        </div>
        <div className="state-card">
          <strong>نشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {activeCategories}
          </p>
        </div>
        <div className="state-card">
          <strong>مؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {archivedCategories}
          </p>
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
        <Link href="/admin/categories/new" className="btn">
          تصنيف جديد
        </Link>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          padding: "16px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص سريع</strong>
        <p style={{ margin: 0 }}>
          يمكنك هنا الوصول السريع إلى التصنيفات حسب الحالة أو البحث بالاسم
          والمعرف والوصف، مع روابط واضحة للتفاصيل والتعديل.
        </p>
      </div>

      <form
        action="/admin/categories"
        method="GET"
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
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
          placeholder="ابحث بالاسم أو المعرف أو الوصف"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          بحث
        </button>

        <Link
          href={buildFilterHref(selectedStatus, "", selectedSort, 1)}
          className="btn small"
        >
          مسح البحث
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
          href={buildFilterHref("ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          جميع الحالات
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

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          عرض {visibleFrom}-{visibleTo} من أصل {sorted.length}
        </p>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          title="لا توجد تصنيفات"
          description="لا توجد تصنيفات تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المعرّف</th>
                  <th>الحالة</th>
                  <th>الترتيب</th>
                  <th>الوصف</th>
                  <th>الإنشاء</th>
                  <th>تفاصيل</th>
                  <th>تعديل</th>
                  <th>أرشفة</th>
                  <th>استعادة</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="admin-table__primary">{category.name}</div>
                    </td>
                    <td>{category.slug}</td>
                    <td>{category.status}</td>
                    <td>{category.sortOrder}</td>
                    <td>{category.description ?? "-"}</td>
                    <td>{formatDateTimeInMakkah(category.createdAt, "ar-BH")}</td>
                    <td>
                      <Link
                        href={`/admin/categories/${category.id}`}
                        className="btn small"
                      >
                        تفاصيل
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/admin/categories/${category.id}/edit`}
                        className="btn small"
                      >
                        تعديل
                      </Link>
                    </td>
                    <td>
                      <AdminCategoryArchiveButton
                        categoryId={category.id}
                        status={category.status}
                      />
                    </td>
                    <td>
                      <AdminCategoryRestoreButton
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
              السابق
            </Link>
            <span className="btn small">
              صفحة {safePage} / {totalPages}
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
              التالي
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
