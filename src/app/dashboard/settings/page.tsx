import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { SettingsForm } from "@/components/settings/settings-form";
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
      error: error instanceof Error ? error.message : "تعذر تحميل الإعدادات.",
    };
  }
}

export default async function DashboardSettingsPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الإعدادات"
        description={error ?? "تعذر تحميل الإعدادات."}
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
        <Link href={`/u/${data.user.username}`} className="btn small">
          الملف العام
        </Link>
        <Link href="/messages" className="btn small">
          الرسائل
        </Link>
        <Link href="/search" className="btn small">
          البحث
        </Link>
      </div>

      <SectionHeading
        eyebrow="Settings"
        title="الإعدادات"
        description="غيّر اللغة والمنطقة الزمنية وبعض بياناتك الأساسية من مكان واحد."
      />

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
        <strong>ملخص الحساب</strong>
        <p style={{ margin: 0 }}>
          اسم المستخدم: @{data.user.username}
        </p>
        <p style={{ margin: 0 }}>
          الاسم المعروض: {profile?.displayName ?? data.user.username}
        </p>
        <p style={{ margin: 0 }}>
          اللغة الحالية: {profile?.locale?.startsWith("en") ? "English" : "العربية"}
        </p>
        <p style={{ margin: 0 }}>
          المنطقة الزمنية الحالية: {profile?.timezone ?? "Asia/Riyadh"}
        </p>
      </div>

      <SettingsForm
        displayName={profile?.displayName ?? data.user.username}
        bio={profile?.bio ?? null}
        avatarUrl={profile?.avatarUrl ?? null}
        locale={profile?.locale ?? "ar"}
        timezone={profile?.timezone ?? "Asia/Riyadh"}
      />
    </section>
  );
}
