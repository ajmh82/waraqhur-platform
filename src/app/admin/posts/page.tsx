import Link from "next/link";
import { AdminPostDeleteButton } from "@/components/admin/admin-post-delete-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminPostsData {
  posts: Array<{
    id: string; title: string; slug: string | null; excerpt: string | null; status: string; visibility: string;
    publishedAt: string | null; createdAt: string; updatedAt: string;
    category: { id: string; name: string; slug: string } | null;
    source: { id: string; name: string; slug: string } | null;
    author: { id: string; email: string; username: string } | null;
    commentsCount: number; likesCount: number;
  }>;
}

interface AdminPostsPageResult { data: AdminPostsData | null; error: string | null }
type SortKey = "newest" | "oldest";
const PAGE_SIZE = 10;

async function loadData(): Promise<AdminPostsPageResult> {
  try { return { data: await dashboardApiGet<AdminPostsData>("/api/posts"), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر تحميل المنشورات." }; }
}

function buildFilterHref(status: string, visibility: string, query: string, sort: SortKey, page: number) {
  const p = new URLSearchParams();
  if (status !== "ALL") p.set("status", status);
  if (visibility !== "ALL") p.set("visibility", visibility);
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "newest") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/admin/posts?${qs}` : "/admin/posts";
}

function getSortedPosts(posts: AdminPostsData["posts"], sort: SortKey) {
  const next = [...posts];
  next.sort((a, b) => { const at = new Date(a.createdAt).getTime(); const bt = new Date(b.createdAt).getTime(); return sort === "oldest" ? at - bt : bt - at; });
  return next;
}

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; visibility?: string; sort?: string; page?: string }> }) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedVisibility = sp.visibility?.trim() ?? "ALL";
  const selectedSort = sp.sort?.trim() === "oldest" ? "oldest" as SortKey : "newest" as SortKey;
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const nq = query.toLowerCase();

  if (error || !data) return <ErrorState title="تعذر تحميل المنشورات" description={error ?? "تعذر تحميل المنشورات."} />;

  const totalPosts = data.posts.length;
  const published = data.posts.filter((p) => p.status === "PUBLISHED").length;
  const drafts = data.posts.filter((p) => p.status === "DRAFT").length;
  const archived = data.posts.filter((p) => p.status === "ARCHIVED").length;
  const statuses = Array.from(new Set(data.posts.map((p) => p.status))).sort();
  const visibilities = Array.from(new Set(data.posts.map((p) => p.visibility))).sort();

  const filtered = data.posts.filter((p) => {
    const sm = selectedStatus === "ALL" || p.status === selectedStatus;
    const vm = selectedVisibility === "ALL" || p.visibility === selectedVisibility;
    const qm = nq.length === 0 || p.title.toLowerCase().includes(nq) || (p.slug ?? "").toLowerCase().includes(nq) || (p.author?.username ?? "").toLowerCase().includes(nq) || (p.category?.name ?? "").toLowerCase().includes(nq) || (p.source?.name ?? "").toLowerCase().includes(nq);
    return sm && vm && qm;
  });

  const sorted = getSortedPosts(filtered, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const vFrom = sorted.length === 0 ? 0 : start + 1;
  const vTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="الإدارة" title="إدارة المنشورات" description="عرض وإدارة جميع المنشورات داخل النظام." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="state-card"><strong>الإجمالي</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalPosts}</p></div>
        <div className="state-card"><strong>منشورة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{published}</p></div>
        <div className="state-card"><strong>مسودات</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{drafts}</p></div>
        <div className="state-card"><strong>مؤرشفة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archived}</p></div>
      </div>

      <form action="/admin/posts" method="GET" style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {selectedStatus !== "ALL" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
        {selectedVisibility !== "ALL" ? <input type="hidden" name="visibility" value={selectedVisibility} /> : null}
        {selectedSort !== "newest" ? <input type="hidden" name="sort" value={selectedSort} /> : null}
        <input type="text" name="q" defaultValue={query} placeholder="اSearch بالعنوان أو الكاتب أو المصدر" style={{ minWidth: "300px" }} />
        <button type="submit" className="btn small">Search</button>
        <Link href={buildFilterHref(selectedStatus, selectedVisibility, "", selectedSort, 1)} className="btn small">مسح الSearch</Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildFilterHref("ALL", selectedVisibility, query, selectedSort, 1)} className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}>جميع الحالات</Link>
        {statuses.map((s) => <Link key={s} href={buildFilterHref(s, selectedVisibility, query, selectedSort, 1)} className={`btn ${selectedStatus === s ? "primary" : "small"}`}>{s}</Link>)}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildFilterHref(selectedStatus, "ALL", query, selectedSort, 1)} className={`btn ${selectedVisibility === "ALL" ? "primary" : "small"}`}>جميع مستويات الظهور</Link>
        {visibilities.map((v) => <Link key={v} href={buildFilterHref(selectedStatus, v, query, selectedSort, 1)} className={`btn ${selectedVisibility === v ? "primary" : "small"}`}>{v}</Link>)}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildFilterHref(selectedStatus, selectedVisibility, query, "newest", 1)} className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}>الأحدث أولاً</Link>
        <Link href={buildFilterHref(selectedStatus, selectedVisibility, query, "oldest", 1)} className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}>الأقدم أولاً</Link>
        <Link href={buildFilterHref("ALL", "ALL", "", "newest", 1)} className="btn small">إعادة ضبط الفلاتر</Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}><p style={{ margin: 0 }}>عرض {vFrom}-{vTo} من أصل {sorted.length}</p></div>

      {paginated.length === 0 ? (
        <EmptyState title="لا توجد منشورات" description="لا توجد منشورات تطابق الSearch أو الفلاتر الحالية." />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>العنوان</th><th>الكاتب</th><th>المصدر</th><th>التصنيف</th><th>الحالة</th><th>الظهور</th><th>التعليقات</th><th>الإعجابات</th><th>النشر</th><th>الإنشاء</th><th>تفاصيل</th><th>تعديل</th><th>فتح</th><th>Delete</th></tr></thead>
              <tbody>
                {paginated.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{post.author?.username ?? "-"}</td>
                    <td>{post.source?.name ?? "-"}</td>
                    <td>{post.category?.name ?? "-"}</td>
                    <td>{post.status}</td>
                    <td>{post.visibility}</td>
                    <td>{post.commentsCount}</td>
                    <td>{post.likesCount}</td>
                    <td>{post.publishedAt ? formatDateTimeInMakkah(post.publishedAt, "ar-BH") : "-"}</td>
                    <td>{formatDateTimeInMakkah(post.createdAt, "ar-BH")}</td>
                    <td><Link href={`/admin/posts/${post.id}`} className="btn small">تفاصيل</Link></td>
                    <td><Link href={`/admin/posts/${post.id}/edit`} className="btn small">تعديل</Link></td>
                    <td>{post.slug ? <Link href={`/posts/${post.slug}`} className="btn small">فتح</Link> : "-"}</td>
                    <td><AdminPostDeleteButton postId={post.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={buildFilterHref(selectedStatus, selectedVisibility, query, selectedSort, Math.max(1, safePage - 1))} className="btn small" aria-disabled={safePage <= 1}>السابق</Link>
            <span className="btn small">صفحة {safePage} / {totalPages}</span>
            <Link href={buildFilterHref(selectedStatus, selectedVisibility, query, selectedSort, Math.min(totalPages, safePage + 1))} className="btn small" aria-disabled={safePage >= totalPages}>التالي</Link>
          </div>
        </>
      )}
    </section>
  );
}
