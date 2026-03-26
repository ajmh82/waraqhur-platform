import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface InvitationsResponse {
  invitations: Array<{
    id: string;
    email: string;
    status: string;
    sentAt: string | null;
    acceptedAt: string | null;
    expiresAt: string;
    role: { name: string } | null;
  }>;
}

async function loadData() {
  try {
    return {
      data: await dashboardApiGet<InvitationsResponse>("/api/invitations"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر التحميل.",
    };
  }
}

export default async function DashboardInvitesPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الدعوات"
        description={error ?? "تعذر التحميل."}
      />
    );
  }

  const invitations = data.invitations ?? [];
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "PENDING"
  ).length;
  const acceptedInvitations = invitations.filter(
    (invitation) => invitation.acceptedAt
  ).length;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الدعوات"
        title="سجل الدعوات"
        description="تتبع الدعوات التي أنشأتها وحالتها الحالية بشكل أوضح."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <article className="state-card">
          <strong>إجمالي الدعوات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {invitations.length}
          </p>
        </article>
        <article className="state-card">
          <strong>معلّقة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {pendingInvitations}
          </p>
        </article>
        <article className="state-card">
          <strong>مقبولة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {acceptedInvitations}
          </p>
        </article>
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
          تعرض هذه الصفحة جميع الدعوات التي أنشأتها، مع حالتها الحالية ووقت
          الإرسال والانتهاء والدور المرتبط بها.
        </p>
      </div>

      {invitations.length === 0 ? (
        <EmptyState
          title="لا توجد دعوات"
          description="ستظهر الدعوات هنا عند إنشائها."
        />
      ) : (
        <div className="dashboard-list">
          {invitations.map((invitation) => (
            <article key={invitation.id} className="dashboard-card">
              <h3>{invitation.email}</h3>

              <dl className="dashboard-detail-list">
                <div>
                  <dt>الحالة</dt>
                  <dd>{invitation.status}</dd>
                </div>
                <div>
                  <dt>الدور</dt>
                  <dd>{invitation.role?.name ?? "غير محدد"}</dd>
                </div>
                <div>
                  <dt>أُرسلت في</dt>
                  <dd>
                    {invitation.sentAt
                      ? formatDateTimeInMakkah(invitation.sentAt, "ar-BH")
                      : "لم تُرسل"}
                  </dd>
                </div>
                <div>
                  <dt>تنتهي في</dt>
                  <dd>
                    {formatDateTimeInMakkah(invitation.expiresAt, "ar-BH")}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
