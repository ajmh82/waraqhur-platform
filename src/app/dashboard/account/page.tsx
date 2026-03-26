import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    profile: {
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
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
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات الحساب.",
    };
  }
}

export default async function DashboardAccountPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الحساب"
        description={error ?? "تعذر تحميل بيانات الحساب."}
      />
    );
  }

  const profile = data.user.profile;

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
        <Link href="/dashboard/profile" className="btn small">
          الملف الشخصي
        </Link>
        <Link href="/dashboard/settings" className="btn small">
          الإعدادات
        </Link>
        <Link href="/dashboard/security" className="btn small">
          الأمان
        </Link>
        <Link href="/search" className="btn small">
          البحث
        </Link>
      </div>

      <SectionHeading
        eyebrow="Account"
        title="الحساب"
        description="هذه الصفحة تعرض بيانات الحساب الأساسية المرتبطة بتسجيل الدخول والملف الشخصي."
      />

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>اسم المستخدم</strong>
          <p style={{ margin: "8px 0 0" }}>@{data.user.username}</p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>البريد الإلكتروني</strong>
          <p style={{ margin: "8px 0 0" }}>{data.user.email}</p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>الحالة</strong>
          <p style={{ margin: "8px 0 0" }}>{data.user.status}</p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>الاسم المعروض</strong>
          <p style={{ margin: "8px 0 0" }}>
            {profile?.displayName ?? data.user.username}
          </p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>اللغة</strong>
          <p style={{ margin: "8px 0 0" }}>
            {profile?.locale?.startsWith("en") ? "English" : "العربية"}
          </p>
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>المنطقة الزمنية</strong>
          <p style={{ margin: "8px 0 0" }}>
            {profile?.timezone ?? "Asia/Riyadh"}
          </p>
        </div>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "18px 0 0",
          display: "grid",
          gap: "10px",
        }}
      >
        <strong>خطوات سريعة</strong>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/dashboard/settings" className="btn small">
            تعديل الإعدادات
          </Link>
          <Link href={`/u/${data.user.username}`} className="btn small">
            فتح الملف العام
          </Link>
          <Link href="/messages" className="btn small">
            فتح الرسائل
          </Link>
        </div>
      </div>
    </section>
  );
}
