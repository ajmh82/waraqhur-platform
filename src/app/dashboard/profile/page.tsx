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
        error instanceof Error ? error.message : "تعذر تحميل الملف الشخصي.",
    };
  }
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export default async function DashboardProfilePage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الملف الشخصي"
        description={error ?? "تعذر تحميل الملف الشخصي."}
      />
    );
  }

  const profile = data.user.profile;
  const displayName = profile?.displayName ?? data.user.username;

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
        <Link href={`/u/${data.user.username}`} className="btn small">
          الملف العام
        </Link>
        <Link href="/messages" className="btn small">
          الرسائل
        </Link>
      </div>

      <SectionHeading
        eyebrow="Profile"
        title="الملف الشخصي"
        description="هنا تجد ملخصًا واضحًا لبياناتك العامة التي تظهر داخل المنصة."
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
            <strong>البريد الإلكتروني</strong>
            <p style={{ margin: "8px 0 0" }}>{data.user.email}</p>
          </div>

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
        </div>

        <div className="state-card" style={{ maxWidth: "100%", margin: 0 }}>
          <strong>النبذة</strong>
          <p style={{ margin: "8px 0 0" }}>
            {profile?.bio ?? "لا توجد نبذة مضافة بعد."}
          </p>
        </div>
      </div>
    </section>
  );
}
