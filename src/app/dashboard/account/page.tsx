import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    profile: {
      displayName: string;
      bio: string | null;
      locale: string | null;
      timezone: string | null;
    } | null;
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

async function loadData() {
  try {
    return {
      data: await dashboardApiGet<CurrentUserResponse>("/api/auth/me"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر التحميل.",
    };
  }
}

export default async function DashboardAccountPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل إعدادات الحساب"
        description={error ?? "تعذر التحميل."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الحساب"
        title="إعدادات الحساب"
        description="عرض بيانات الحساب الأساسية وحالة الجلسة الحالية بشكل أوضح."
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
          <strong>حالة الحساب</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {data.user.status}
          </p>
        </article>
        <article className="state-card">
          <strong>اللغة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {data.user.profile?.locale ?? "غير محدد"}
          </p>
        </article>
        <article className="state-card">
          <strong>المنطقة الزمنية</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {data.user.profile?.timezone ?? "غير محدد"}
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
          هذه الصفحة تلخص بيانات الحساب الرسمية المرتبطة بك، مع معلومات الجلسة
          الحالية التي تساعدك على متابعة وضع الحساب بسرعة.
        </p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>هوية الحساب</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>البريد الإلكتروني</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt>اسم المستخدم</dt>
              <dd>{data.user.username}</dd>
            </div>
            <div>
              <dt>حالة الحساب</dt>
              <dd>{data.user.status}</dd>
            </div>
            <div>
              <dt>الاسم المعروض</dt>
              <dd>{data.user.profile?.displayName ?? "غير محدد"}</dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>الجلسة النشطة</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>تنتهي في</dt>
              <dd>{formatDateTimeInMakkah(data.session.expiresAt, "ar-BH")}</dd>
            </div>
            <div>
              <dt>آخر نشاط</dt>
              <dd>
                {data.session.lastUsedAt
                  ? formatDateTimeInMakkah(data.session.lastUsedAt, "ar-BH")
                  : "غير متوفر"}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
