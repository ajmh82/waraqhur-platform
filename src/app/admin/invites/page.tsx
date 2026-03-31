import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminInvitationsResponse { invitations: Array<{ id: string; email: string; token: string; status: string; sentAt: string | null; acceptedAt: string | null; revokedAt: string | null; expiresAt: string; createdAt: string; role: { key: string; name: string } | null; issuerUser: { id: string; email: string; username: string }; usages: Array<{ id: string; usedAt: string; user: { id: string; email: string; username: string } }> }> }
type SortKey = "newest" | "oldest" | "expires-soon";
const PAGE_SIZE = 10;

async function loadData() {
  try { return { data: await dashboardApiGet<AdminInvitationsResponse>("/api/invitations"), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر تحميل الدعوات." }; }
}

function buildHref(status: string, query: string, sort: SortKey, page: number) {
  const p = new URLSearchParams();
  if (status !== "ALL") p.set("status", status);
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "newest") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/admin/invites?${qs}` : "/admin/invites";
}

function getSorted(invitations: AdminInvitationsResponse["invitations"], sort: SortKey) {
  const next = [...invitations];
  if (sort === "oldest") { next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); return next; }
  if (sort === "expires-soon") { next.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()); return next; }
  next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return next;
}

export default async function AdminInvitesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }> }) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedSort = (sp.sort?.trim() === "oldest" || sp.sort?.trim() === "expires-soon") ? sp.sort.trim() as SortKey : "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const nq = query.toLowerCase();

  if (error || !data) return <ErrorState title="تعذر تحميل الدعوات" description={error ?? "تعذر تحميل الدعوات."} />;

  const invitations = data.invitations ?? [];
  const total = invitations.length;
  const pending = invitations.filter((i) => i.status === "PENDING").length;
  const accepted = invitations.filter((i) => i.status === "ACCEPTED").length;
  const revoked = invitations.filter((i) => i.status === "REVOKED").length;
  const statuses = Array.from(new Set(invitations.map((i) => i.status))).sort();

  const filtered = invitations.filter((i) => {
    const sm = selectedStatus === "ALL" || i.status === selectedStatus;
    const qm = nq.length === 0 || i.email.toLowerCase().includes(nq) || i.issuerUser.username.toLowerCase().includes(nq) || (i.role?.name ?? "").toLowerCase().includes(nq);
    return sm && qm;
  });

  const sorted = getSorted(filtered, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const vFrom = sorted.length === 0 ? 0 : start + 1;
  const vTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="الإدارة" title="إدارة الدعوات" description="عرض وإدارة جميع الدعوات في النظام." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="state-card"><strong>الإجمالي</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{total}</p></div>
        <div className="state-card"><strong>معلّقة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{pending}</p></div>
        <div className="state-card"><strong>مقبولة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{accepted}</p></div>
        <div className="state-card"><strong>ملغاة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{revoked}</p></div>
      </div>
      <form action="/admin/invites" method="GET" style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {selectedStatus !== "ALL" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
        {selectedSort !== "newest" ? <input type="hidden" name="sort" value={selectedSort} /> : null}
        <input type="text" name="q" defaultValue={query} placeholder="ابحث بالبريد أو المُرسِل أو الدور" style={{ minWidth: "300px" }} />
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
        <Link href={buildHref(selectedStatus, query, "expires-soon", 1)} className={`btn ${selectedSort === "expires-soon" ? "primary" : "small"}`}>تنتهي قريباً</Link>
      </div>
      <div className="state-card" style={{ marginBottom: "18px" }}><p style={{ margin: 0 }}>عرض {vFrom}-{vTo} من أصل {sorted.length}</p></div>
      {paginated.length === 0 ? <EmptyState title="لا توجد دعوات" description="لا توجد دعوات تطابق الSearch أو الفلاتر الحالية." /> : (
        <>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>البريد</th><th>الحالة</th><th>الدور</th><th>المُرسِل</th><th>أُرسلت في</th><th>تنتهي في</th><th>قُبلت في</th></tr></thead>
            <tbody>{paginated.map((i) => (
              <tr key={i.id}>
                <td>{i.email}</td><td>{i.status}</td><td>{i.role?.name ?? "غير محدد"}</td><td>{i.issuerUser.username}</td>
                <td>{i.sentAt ? formatDateTimeInMakkah(i.sentAt, "ar-BH") : "لم تُرسل"}</td>
                <td>{formatDateTimeInMakkah(i.expiresAt, "ar-BH")}</td>
                <td>{i.acceptedAt ? formatDateTimeInMakkah(i.acceptedAt, "ar-BH") : "-"}</td>
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
