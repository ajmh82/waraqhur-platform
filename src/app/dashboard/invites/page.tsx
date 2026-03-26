import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface InvitationsResponse {
  invitations: Array<{ id: string; email: string; status: string; sentAt: string | null; acceptedAt: string | null; expiresAt: string; role: { name: string } | null }>;
}

async function loadData() {
  try { return { data: await dashboardApiGet<InvitationsResponse>("/api/invitations"), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر التحميل." }; }
}

export default async function DashboardInvitesPage() {
  const { data, error } = await loadData();
  if (error || !data) return <ErrorState title="تعذر تحميل الدعوات" description={error ?? "تعذر التحميل."} />;

  const invitations = data.invitations ?? [];
  const pending = invitations.filter((i) => i.status === "PENDING").length;
  const accepted = invitations.filter((i) => i.acceptedAt).length;

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="الدعوات" title="سجل الدعوات" description="تتبع الدعوات التي أنشأتها وحالتها." />
      <div className="dashboard-grid" style={{ marginBottom: "18px" }}>
        <article className="dashboard-card"><h3>إجمالي الدعوات</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{invitations.length}</p></article>
        <article className="dashboard-card"><h3>معلّقة</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{pending}</p></article>
        <article className="dashboard-card"><h3>مقبولة</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{accepted}</p></article>
      </div>
      {invitations.length === 0 ? (
        <EmptyState title="لا توجد دعوات" description="ستظهر الدعوات هنا عند إنشائها." />
      ) : (
        <div className="dashboard-list">
          {invitations.map((inv) => (
            <article key={inv.id} className="dashboard-card">
              <h3>{inv.email}</h3>
              <dl className="dashboard-detail-list">
                <div><dt>الحالة</dt><dd>{inv.status}</dd></div>
                <div><dt>الدور</dt><dd>{inv.role?.name ?? "غير محدد"}</dd></div>
                <div><dt>أُرسلت في</dt><dd>{inv.sentAt ? formatDateTimeInMakkah(inv.sentAt, "ar-BH") : "لم تُرسل"}</dd></div>
                <div><dt>تنتهي في</dt><dd>{formatDateTimeInMakkah(inv.expiresAt, "ar-BH")}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
