import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface SecurityResponse {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    lastLoginAt: string | null;
    emailVerifiedAt: string | null;
  };
  sessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
}

async function loadData() {
  try {
    return {
      data: await dashboardApiGet<SecurityResponse>("/api/dashboard/security"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل صفحة الأمان.",
    };
  }
}

export default async function DashboardSecurityPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الأمان"
        description={error ?? "تعذر تحميل صفحة الأمان."}
      />
    );
  }

  const activeSessions = data.sessions.filter((session) => !session.revokedAt);

  return (
    <section className="dashboard-panel">
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <Link href="/dashboard/settings" className="btn small">
          الإعدادات
        </Link>
        <Link href="/dashboard/account" className="btn small">
          الحساب
        </Link>
        <Link href="/messages" className="btn small">
          الرسائل
        </Link>
        <Link href={`/u/${data.user.username}`} className="btn small">
          الملف العام
        </Link>
      </div>

      <SectionHeading
        eyebrow="Security"
        title="الأمان"
        description="راجع حالة تسجيل الدخول والتحقق والجلسات النشطة المرتبطة بحسابك."
      />

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          marginBottom: "18px",
        }}
      >
        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>البريد الإلكتروني</strong>
          <p style={{ margin: "8px 0 0" }}>{data.user.email}</p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>توثيق البريد</strong>
          <p style={{ margin: "8px 0 0" }}>
            {data.user.emailVerifiedAt ? "موثق" : "غير موثق"}
          </p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>آخر تسجيل دخول</strong>
          <p style={{ margin: "8px 0 0" }}>
            {data.user.lastLoginAt
              ? formatDateTimeInMakkah(data.user.lastLoginAt, "ar-BH")
              : "غير متوفر"}
          </p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>الجلسات النشطة</strong>
          <p style={{ margin: "8px 0 0" }}>{activeSessions.length}</p>
        </div>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص الأمان</strong>
        <p style={{ margin: 0 }}>
          لديك {activeSessions.length} جلسة نشطة من أصل {data.sessions.length} جلسة
          محفوظة في النظام.
        </p>
      </div>

      <div className="dashboard-list">
        {data.sessions.map((session) => (
          <article key={session.id} className="dashboard-card">
            <strong>{session.userAgent ?? "جلسة بدون User Agent"}</strong>

            <div
              style={{
                marginTop: "10px",
                display: "grid",
                gap: "6px",
                color: "var(--muted)",
                fontSize: "14px",
              }}
            >
              <span>IP: {session.ipAddress ?? "غير معروف"}</span>
              <span>
                آخر استخدام:{" "}
                {session.lastUsedAt
                  ? formatDateTimeInMakkah(session.lastUsedAt, "ar-BH")
                  : "غير متوفر"}
              </span>
              <span>
                انتهاء الجلسة: {formatDateTimeInMakkah(session.expiresAt, "ar-BH")}
              </span>
              <span>{session.revokedAt ? "تم إلغاء الجلسة" : "جلسة نشطة"}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
