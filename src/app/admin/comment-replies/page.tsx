import Link from "next/link";
import { AdminCommentActions } from "@/components/admin/admin-comment-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminCommentsData { comments?: Array<{ id: string; postId: string; parentId: string | null; content: string; status: string; createdAt: string; updatedAt: string; author: { id: string; email: string; username: string } | null; repliesCount: number; replies?: Array<{ id: string; postId: string; parentId: string | null; content: string; status: string; createdAt: string; updatedAt: string; author: { id: string; email: string; username: string } | null; repliesCount: number }> }> }
interface ReplyRecord { id: string; postId: string; parentId: string; parentContent: string; content: string; status: string; createdAt: string; updatedAt: string; author: { id: string; email: string; username: string } | null }
type SortKey = "newest" | "oldest";
const PAGE_SIZE = 10;

async function loadData() {
  try {
    const data = await dashboardApiGet<AdminCommentsData>("/api/comments");
    const comments = data.comments ?? [];
    const replies = comments.flatMap((c) => (c.replies ?? []).map((r) => ({ id: r.id, postId: r.postId, parentId: c.id, parentContent: c.content, content: r.content, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt, author: r.author })));
    return { replies, error: null };
  } catch (error) { return { replies: null, error: error instanceof Error ? error.message : "تعذر تحميل الردود." }; }
}

function buildHref(status: string, query: string, sort: SortKey, page: number) {
  const p = new URLSearchParams();
  if (status !== "ALL") p.set("status", status);
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "newest") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/admin/comment-replies?${qs}` : "/admin/comment-replies";
}

export default async function AdminCommentRepliesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }> }) {
  const { replies, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedSort = sp.sort?.trim() === "oldest" ? "oldest" as SortKey : "newest" as SortKey;
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const nq = query.toLowerCase();

  if (error || !replies) return <ErrorState title="تعذر تحميل الردود" description={error ?? "تعذر تحميل الردود."} />;

  const total = replies.length;
  const active = replies.filter((r) => r.status === "ACTIVE").length;
  const hidden = replies.filter((r) => r.status === "HIDDEN").length;
  const statuses = Array.from(new Set(replies.map((r) => r.status))).sort();

  const filtered = replies.filter((r) => {
    const sm = selectedStatus === "ALL" || r.status === selectedStatus;
    const qm = nq.length === 0 || r.content.toLowerCase().includes(nq) || r.parentContent.toLowerCase().includes(nq) || (r.author?.username ?? "").toLowerCase().includes(nq);
    return sm && qm;
  });

  const sorted = [...filtered].sort((a, b) => { const at = new Date(a.createdAt).getTime(); const bt = new Date(b.createdAt).getTime(); return selectedSort === "oldest" ? at - bt : bt - at; });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const vFrom = sorted.length === 0 ? 0 : start + 1;
  const vTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="الإدارة" title="إدارة ردود التعليقات" description="عرض وإدارة الردود على التعليقات." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="state-card"><strong>الإجمالي</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{total}</p></div>
        <div className="state-card"><strong>نشطة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{active}</p></div>
        <div className="state-card"><strong>مخفية</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{hidden}</p></div>
      </div>
      <form action="/admin/comment-replies" method="GET" style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {selectedStatus !== "ALL" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
        {selectedSort !== "newest" ? <input type="hidden" name="sort" value={selectedSort} /> : null}
        <input type="text" name="q" defaultValue={query} placeholder="اSearch في الرد أو التعليق الأصلي أو الكاتب" style={{ minWidth: "320px" }} />
        <button type="submit" className="btn small">Search</button>
        <Link href={buildHref(selectedStatus, "", selectedSort, 1)} className="btn small">مسح الSearch</Link>
      </form>
      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref("ALL", query, selectedSort, 1)} className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}>جميع الحالات</Link>
        {statuses.map((s) => <Link key={s} href={buildHref(s, query, selectedSort, 1)} className={`btn ${selectedStatus === s ? "primary" : "small"}`}>{s}</Link>)}
      </div>
      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref(selectedStatus, query, "newest", 1)} className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}>الأحدث أولاً</Link>
        <Link href={buildHref(selectedStatus, query, "oldest", 1)} className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}>الأقدم أولاً</Link>
      </div>
      <div className="state-card" style={{ marginBottom: "18px" }}><p style={{ margin: 0 }}>عرض {vFrom}-{vTo} من أصل {sorted.length}</p></div>
      {paginated.length === 0 ? <EmptyState title="لا توجد ردود" description="لا توجد ردود تطابق الSearch أو الفلاتر." /> : (
        <>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>الرد</th><th>التعليق الأصلي</th><th>الكاتب</th><th>المنشور</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
            <tbody>{paginated.map((r) => (
              <tr key={r.id}>
                <td style={{ maxWidth: "320px" }}>{r.content}</td><td style={{ maxWidth: "320px" }}>{r.parentContent}</td>
                <td>{r.author?.username ?? "-"}</td><td>{r.postId}</td><td>{r.status}</td>
                <td>{formatDateTimeInMakkah(r.createdAt, "ar-BH")}</td>
                <td><AdminCommentActions comment={{ id: r.id, status: r.status }} /></td>
              </tr>
            ))}</tbody>
          </table></div>
          <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={buildHref(selectedStatus, query, selectedSort, Math.max(1, safePage - 1))} className="btn small" aria-disabled={safePage <= 1}>السابق</Link>
            <span className="btn small">صفحة {safePage} / {totalPages}</span>
            <Link href={buildHref(selectedStatus, query, selectedSort, Math.min(totalPages, safePage + 1))} className="btn small" aria-disabled={safePage >= totalPages}>التالي</Link>
          </div>
        </>
      )}
    </section>
  );
}
