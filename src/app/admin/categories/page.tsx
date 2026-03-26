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
    id: string; name: string; slug: string; description: string | null;
    status: string; sortOrder: number; createdAt: string; updatedAt: string;
  }>;
}

interface AdminCategoriesPageResult { data: AdminCategoriesResponse | null; error: string | null }
type SortKey = "newest" | "oldest";
const PAGE_SIZE = 10;

async function loadData(): Promise<AdminCategoriesPageResult> {
  try { return { data: await dashboardApiGet<AdminCategoriesResponse>("/api/categories"), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر تحميل التصنيفات." }; }
}

function buildFilterHref(status: string, query: string, sort: SortKey, page: number) {
  const p = new URLSearchParams();
  if (status !== "ALL") p.set("status", status);
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "newest") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/admin/categories?${qs}` : "/admin/categories";
}

function getSortedCategories(categories: AdminCategoriesResponse["categories"], sort: SortKey) {
  const next = [...categories];
  next.sort((a, b) => { const at = new Date(a.createdAt).getTime(); const bt = new Date(b.createdAt).getTime(); return sort === "oldest" ? at - bt : bt - at; });
  return next;
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }> }) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedSort = (sp.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const nq = query.toLowerCase();

  if (error || !data) return <ErrorState title="تعذر تحميل التصنيفات" description={error ?? "تعذر تحميل التصنيفات."} />;

  const total = data.categories.length;
  const active = data.categories.filter((c) => c.status === "ACTIVE").length;
  const archived = data.categories.filter((c) => c.status === "ARCHIVED").length;
  const statuses = Array.from(new Set(data.categories.map((c) => c.status))).sort();

  const filtered = data.categories.filter((c) => {
    const sm = selectedStatus === "ALL" || c.status === selectedStatus;
    const qm = nq.length === 0 || c.name.toLowerCase().includes(nq) || c.slug.toLowerCase().includes(nq);
    return sm && qm;
  });

  const sorted = getSortedCategories(filtered, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const vFrom = sorted.length === 0 ? 0 : start + 1;
  const vTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="الإدارة" title="إدارة التصنيفات" description="عرض وإدارة جميع التصنيفات في النظام." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="state-card"><strong>الإجمالي</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{total}</p></div>
        <div className="state-card"><strong>نشطة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{active}</p></div>
        <div className="state-card"><strong>مؤرشفة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archived}</p></div>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/categories/new" className="btn primary">تصنيف جديد</Link>
      </div>

      <form action="/admin/categories" method="GET" style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {selectedStatus !== "ALL" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
        {selectedSort !== "newest" ? <input type="hidden" name="sort" value={selectedSort} /> : null}
        <input type="text" name="q" defaultValue={query} placeholder="اSearch بالاسم أو المعرّف" style={{ minWidth: "280px" }} />
        <button type="submit" className="btn small">Search</button>
        <Link href={buildFilterHref(selectedStatus, "", selectedSort, 1)} className="btn small">مسح الSearch</Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildFilterHref("ALL", query, selectedSort, 1)} className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}>جميع الحالات</Link>
        {statuses.map((s) => <Link key={s} href={buildFilterHref(s, query, selectedSort, 1)} className={`btn ${selectedStatus === s ? "primary" : "small"}`}>{s}</Link>)}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildFilterHref(selectedStatus, query, "newest", 1)} className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}>الأحدث أولاً</Link>
        <Link href={buildFilterHref(selectedStatus, query, "oldest", 1)} className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}>الأقدم أولاً</Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}><p style={{ margin: 0 }}>عرض {vFrom}-{vTo} من أصل {sorted.length}</p></div>

      {paginated.length === 0 ? (
        <EmptyState title="لا توجد تصنيفات" description="لا توجد تصنيفات تطابق الSearch أو الفلاتر الحالية." />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>الاسم</th><th>المعرّف</th><th>الحالة</th><th>الترتيب</th><th>الوصف</th><th>الإنشاء</th><th>تفاصيل</th><th>تعديل</th><th>أرشفة</th><th>استعادة</th></tr></thead>
              <tbody>
                {paginated.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td>{cat.slug}</td>
                    <td>{cat.status}</td>
                    <td>{cat.sortOrder}</td>
                    <td>{cat.description ?? "-"}</td>
                    <td>{formatDateTimeInMakkah(cat.createdAt, "ar-BH")}</td>
                    <td><Link href={`/admin/categories/${cat.id}`} className="btn small">تفاصيل</Link></td>
                    <td><Link href={`/admin/categories/${cat.id}/edit`} className="btn small">تعديل</Link></td>
                    <td><AdminCategoryArchiveButton categoryId={cat.id} status={cat.status} /></td>
                    <td><AdminCategoryRestoreButton categoryId={cat.id} status={cat.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={buildFilterHref(selectedStatus, query, selectedSort, Math.max(1, safePage - 1))} className="btn small" aria-disabled={safePage <= 1}>السابق</Link>
            <span className="btn small">صفحة {safePage} / {totalPages}</span>
            <Link href={buildFilterHref(selectedStatus, query, selectedSort, Math.min(totalPages, safePage + 1))} className="btn small" aria-disabled={safePage >= totalPages}>التالي</Link>
          </div>
        </>
      )}
    </section>
  );
}
