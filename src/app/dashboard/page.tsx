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
        error instanceof Error ? error.message : "تعذر تحميل لوحة المستخدم.",
    };
  }
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export default async function DashboardHomePage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل لوحة المستخدم"
        description={error ?? "تعذر تحميل لوحة المستخدم."}
      />
    );
  }

  const profile = data.user.profile;
  const displayName = profile?.displayName ?? data.user.username;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Dashboard"
        title="لوحة المستخدم"
        description="هذه هي نقطة الدخول المركزية إلى حسابك، علاقاتك، رسائلك، وإعداداتك داخل المنصة."
      />

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            className="tweet-card__avatar"
            style={{ width: "64px", height: "64px", fontSize: "24px" }}
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={data.user.username}
                className="account-menu__avatar-image"
              />
            ) : (
              getInitial(displayName)
            )}
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <strong style={{ fontSize: "20px" }}>{displayName}</strong>
            <span style={{ color: "var(--muted)" }}>@{data.user.username}</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
            <strong>الحالة</strong>
            <p style={{ margin: "8px 0 0" }}>{data.user.status}</p>
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

          <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
            <strong>البريد الإلكتروني</strong>
            <p style={{ margin: "8px 0 0" }}>{data.user.email}</p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <Link href="/dashboard/profile" className="dashboard-home-card">
          <strong>الملف الشخصي</strong>
          <p>راجع الاسم والصورة والنبذة ومعلوماتك العامة.</p>
        </Link>

        <Link href="/dashboard/account" className="dashboard-home-card">
          <strong>الحساب</strong>
          <p>راجع بيانات الحساب الأساسية المرتبطة بتسجيل الدخول.</p>
        </Link>

        <Link href="/dashboard/settings" className="dashboard-home-card">
          <strong>الإعدادات</strong>
          <p>غيّر اللغة والمنطقة الزمنية والصورة والنبذة من مكان واحد.</p>
        </Link>

        <Link href="/dashboard/security" className="dashboard-home-card">
          <strong>الأمان</strong>
          <p>راجع الجلسات النشطة وآخر تسجيل دخول وحالة الأمان.</p>
        </Link>

        <Link href="/dashboard/activity" className="dashboard-home-card">
          <strong>النشاط</strong>
          <p>تابع أحدث منشوراتك وتعليقاتك في ملخص واحد.</p>
        </Link>

        <Link href="/dashboard/notifications" className="dashboard-home-card">
          <strong>الإشعارات</strong>
          <p>اعرض التنبيهات والتنبيهات غير المقروءة المرتبطة بحسابك.</p>
        </Link>

        <Link href="/dashboard/invites" className="dashboard-home-card">
          <strong>الدعوات</strong>
          <p>راجع الدعوات النشطة وحالاتها الحالية.</p>
        </Link>

        <Link href="/messages" className="dashboard-home-card">
          <strong>الرسائل</strong>
          <p>انتقل مباشرة إلى المحادثات الخاصة والرسائل غير المقروءة.</p>
        </Link>

        <Link href="/search" className="dashboard-home-card">
          <strong>البحث</strong>
          <p>ابحث عن الحسابات والمنشورات وانتقل إليها بسرعة.</p>
        </Link>

        <Link href={`/u/${data.user.username}`} className="dashboard-home-card">
          <strong>الملف العام</strong>
          <p>افتح صفحتك العامة كما يراها الآخرون داخل المنصة.</p>
        </Link>
      </div>
    </section>
  );
}
