import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminRolesResponse { data: { roles: Array<{ id: string; key: string; name: string; description: string | null; isSystem: boolean; usersCount: number; permissions: string[]; createdAt: string; updatedAt: string }> } }
type SortKey = "newest" | "oldest" | "most-users";
const PAGE_SIZE = 10;

async function loadData() {
  try { const r = await dashboardApiGet<AdminRolesResponse>("/api/admin/roles"); return { data: r.data, error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر تحميل الأدوار." }; }
}

function buildHref(type: string, query: string, sort: SortKey, page: number) {
  const p = new URLSearchParams();
  if (type !== "ALL") p.set("type", type);
  if (query.trim()) p.set("q", query.trim());
  if (sort !== "newest") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/admin/roles?${qs}` : "/admin/roles";
}

function getSorted(roles: AdminRolesResponse["data"]["roles"], sort: SortKey) {
  const next = [...roles];
  if (sort === "oldest") { next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); return next; }
  if (sort === "most-users") { next.sort((a, b) => b.usersCount - a.usersCount); return next; }
  next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return next;
}

export default async function AdminRolesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; sort?: string; page?: string }> }) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedType = sp.type?.trim() ?? "ALL";
  const selectedSort = (sp.sort?.trim() === "oldest" || sp.sort?.trim() === "most-users") ? sp.sort.trim() as SortKey : "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const nq = query.toLowerCase();

  if (error || !data) return <ErrorState title="تعذر تحميل الأدوار" description={error ?? "تعذر تحميل الأدوار."} />;

  const roles = data.roles ?? [];
  const total = roles.length;
  const system = roles.filter((r) => r.isSystem).length;
  const custom = roles.filter((r) => !r.isSystem).length;
  const totalAssignments = roles.reduce((s, r) => s + r.usersCount, 0);

  const filtered = roles.filter((r) => {
    const tm = selectedType === "ALL" || (selectedType === "SYSTEM" && r.isSystem) || (selectedType === "CUSTOM" && !r.isSystem);
    const qm = nq.length === 0 || r.name.toLowerCase().includes(nq) || r.key.toLowerCase().includes(nq) || (r.description ?? "").toLowerCase().includes(nq) || r.permissions.some((p) => p.toLowerCase().includes(nq));
    return tm && qm;
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
      <SectionHeading eyebrow="الإدارة" title="الأدوار والصلاحيات" description="عرض جميع الأدوار والصلاحيات المرتبطة بكل دور." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div className="state-card"><strong>إجمالي الأدوار</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{total}</p></div>
        <div className="state-card"><strong>نظامية</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{system}</p></div>
        <div className="state-card"><strong>مخصصة</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{custom}</p></div>
        <div className="state-card"><strong>إجمالي الإسنادات</strong><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalAssignments}</p></div>
      </div>
      <form action="/admin/roles" method="GET" style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {selectedType !== "ALL" ? <input type="hidden" name="type" value={selectedType} /> : null}
        {selectedSort !== "newest" ? <input type="hidden" name="sort" value={selectedSort} /> : null}
        <input type="text" name="q" defaultValue={query} placeholder="ابحث باسم الدور أو الصلاحية" style={{ minWidth: "300px" }} />
        <button type="submit" className="btn small">Search</button>
        <Link href={buildHref(selectedType, "", selectedSort, 1)} className="btn small">مسح الSearch</Link>
      </form>
      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref("ALL", query, selectedSort, 1)} className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}>جميع الأنواع</Link>
        <Link href={buildHref("SYSTEM", query, selectedSort, 1)} className={`btn ${selectedType === "SYSTEM" ? "primary" : "small"}`}>نظامية فقط</Link>
        <Link href={buildHref("CUSTOM", query, selectedSort, 1)} className={`btn ${selectedType === "CUSTOM" ? "primary" : "small"}`}>مخصصة فقط</Link>
      </div>
      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={buildHref(selectedType, query, "newest", 1)} className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}>الأحدث أولاً</Link>
        <Link href={buildHref(selectedType, query, "oldest", 1)} className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}>الأقدم أولاً</Link>
        <Link href={buildHref(selectedType, query, "most-users", 1)} className={`btn ${selectedSort === "most-users" ? "primary" : "small"}`}>الأكثر مستخدمين</Link>
      </div>
      <div className="state-card" style={{ marginBottom: "18px" }}><p style={{ margin: 0 }}>عرض {vFrom}-{vTo} من أصل {sorted.length}</p></div>
      {paginated.length === 0 ? <EmptyState title="لا توجد أدوار" description="لا توجد أدوار تطابق الSearch أو الفلاتر." /> : (
        <>
          <div style={{ display: "grid", gap: "14px" }}>
            {paginated.map((role) => (
              <article key={role.id} className="state-card">
                <div style={{ display: "grid", gap: "10px" }}>
                  <p style={{ margin: 0 }}><strong>{role.name}</strong> ({role.key})</p>
                  <p style={{ margin: 0 }}><strong>الوصف:</strong> {role.description ?? "-"}</p>
                  <p style={{ margin: 0 }}><strong>النوع:</strong> {role.isSystem ? "نظامي" : "مخصص"}</p>
                  <p style={{ margin: 0 }}><strong>عدد المستخدمين:</strong> {role.usersCount}</p>
                  <p style={{ margin: 0 }}><strong>تاريخ الإنشاء:</strong> {formatDateTimeInMakkah(role.createdAt, "ar-BH")}</p>
                  <div><strong>الصلاحيات:</strong>
                    {role.permissions.length === 0 ? <p style={{ marginTop: "8px", marginBottom: 0 }}>لا توجد صلاحيات مرتبطة.</p> : (
                      <div className="admin-chip-list" style={{ marginTop: "8px" }}>{role.permissions.map((p) => <span key={p} className="badge-chip">{p}</span>)}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Link href={`/admin/roles/${role.id}`} className="btn small">تفاصيل الدور</Link>
                    <Link href={`/admin/roles/${role.id}/users`} className="btn small">مستخدمو الدور</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={buildHref(selectedType, query, selectedSort, Math.max(1, safePage - 1))} className="btn small" aria-disabled={safePage <= 1}>السابق</Link>
            <span className="btn small">صفحة {safePage} / {totalPages}</span>
            <Link href={buildHref(selectedType, query, selectedSort, Math.min(totalPages, safePage + 1))} className="btn small" aria-disabled={safePage >= totalPages}>التالي</Link>
          </div>
        </>
      )}
    </section>
  );
}
