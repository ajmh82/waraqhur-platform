import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminAuditLogsResponse { data: { auditLogs: Array<{ id: string; action: string; actorType: string; actorUserId: string | null; targetType: string; targetId: string | null; metadata: Record<string, unknown> | null; createdAt: string }> } }
type SortKey = "newest" | "oldest";
const PAGE_SIZE = 10;

async function loadData() {
  try { const r = await dashboardApiGet<AdminAuditLogsResponse>("/api/admin/audit-logs"); return { data: r.data, error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر تحميل سجل العمليات." }; }
}

function buildHref(actorType: string, targetType: string, query: string, sort: SortKey, page: number) {
  const p = new URLSearchParams();
  if (actorType !== "ALL") p.set("actorType", actorType);
  if (targetType !== "ALL") p.set("targetType", targetType);
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "newest") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs";
}

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<{ q?: string; actorType?: string; targetType?: string; sort?: string; page?: string }> }) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedActorType = sp.actorType?.trim() ?? "ALL";
  const selectedTargetType = sp.targetType?.trim() ?? "ALL";
  const selectedSort = sp.sort?.trim() === "oldest" ? "oldest" as SortKey : "newest" as SortKey;
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const nq = query.toLowerCase();

  if (error || !data) return <ErrorState title="تعذر تحميل سجل العمليات" description={error ?? "تعذر تحميل سجل العمليات."} />;

  const logs = data.auditLogs ?? [];
  const total = logs.length;
  const actorTypes = Array.from(new Set(logs.map((l) => l.actorType))).sort();
  const targetTypes = Array.from(new Set(logs.map((l) => l.targetType))).sort();

  const filtered = logs.filter((l) => {
    const am = selectedActorType === "ALL" || l.actorType === selectedActorType;
    const tm = selectedTargetType === "ALL" || l.targetType === selectedTargetType;
    const qm = nq.length === 0 || l.action.toLowerCase().includes(nq) || (l.targetId ?? "").toLowerCase().includes(nq) || (l.actorUserId ?? "").toLowerCase().includes(nq);
    return am && tm && qm;
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
      <SectionHeading eyebrow="الإدارة" title="سجل العمليات" description="مراجعة جميع العمليات الإدارية المسجلة في النظام." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="state-card"><strong>إجمالي السجلات</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{total}</p></div>
      </div>
      <form action="/admin/audit-logs" method="GET" style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {selectedActorType !== "ALL" ? <input type="hidden" name="actorType" value={selectedActorType} /> : null}
        {selectedTargetType !== "ALL" ? <input type="hidden" name="targetType" value={selectedTargetType} /> : null}
        {selectedSort !== "newest" ? <input type="hidden" name="sort" value={selectedSort} /> : null}
        <input type="text" name="q" defaultValue={query} placeholder="ابحث في الإجراء أو المعرّف" style={{ minWidth: "300px" }} />
        <button type="submit" className="btn small">Search</button>
        <Link href={buildHref(selectedActorType, selectedTargetType, "", selectedSort, 1)} className="btn small">مسح الSearch</Link>
      </form>
      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref("ALL", selectedTargetType, query, selectedSort, 1)} className={`btn ${selectedActorType === "ALL" ? "primary" : "small"}`}>جميع المنفّذين</Link>
        {actorTypes.map((a) => <Link key={a} href={buildHref(a, selectedTargetType, query, selectedSort, 1)} className={`btn ${selectedActorType === a ? "primary" : "small"}`}>{a}</Link>)}
      </div>
      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref(selectedActorType, "ALL", query, selectedSort, 1)} className={`btn ${selectedTargetType === "ALL" ? "primary" : "small"}`}>جميع الأهداف</Link>
        {targetTypes.map((t) => <Link key={t} href={buildHref(selectedActorType, t, query, selectedSort, 1)} className={`btn ${selectedTargetType === t ? "primary" : "small"}`}>{t}</Link>)}
      </div>
      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref(selectedActorType, selectedTargetType, query, "newest", 1)} className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}>الأحدث أولاً</Link>
        <Link href={buildHref(selectedActorType, selectedTargetType, query, "oldest", 1)} className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}>الأقدم أولاً</Link>
      </div>
      <div className="state-card" style={{ marginBottom: "18px" }}><p style={{ margin: 0 }}>عرض {vFrom}-{vTo} من أصل {sorted.length}</p></div>
      {paginated.length === 0 ? <EmptyState title="لا توجد سجلات" description="لا توجد سجلات تطابق الSearch أو الفلاتر." /> : (
        <>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>الإجراء</th><th>نوع المنفّذ</th><th>المنفّذ</th><th>نوع الهدف</th><th>معرّف الهدف</th><th>التاريخ</th></tr></thead>
            <tbody>{paginated.map((l) => (
              <tr key={l.id}><td>{l.action}</td><td>{l.actorType}</td><td>{l.actorUserId ?? "-"}</td><td>{l.targetType}</td><td>{l.targetId ?? "-"}</td><td>{formatDateTimeInMakkah(l.createdAt, "ar-BH")}</td></tr>
            ))}</tbody>
          </table></div>
          <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={buildHref(selectedActorType, selectedTargetType, query, selectedSort, Math.max(1, safePage - 1))} className="btn small" aria-disabled={safePage <= 1}>السابق</Link>
            <span className="btn small">صفحة {safePage} / {totalPages}</span>
            <Link href={buildHref(selectedActorType, selectedTargetType, query, selectedSort, Math.min(totalPages, safePage + 1))} className="btn small" aria-disabled={safePage >= totalPages}>التالي</Link>
          </div>
        </>
      )}
    </section>
  );
}
