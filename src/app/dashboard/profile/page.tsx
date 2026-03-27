import { cookies } from "next/headers";
import { ErrorState } from "@/components/ui/error-state";
import { SettingsForm } from "@/components/settings/settings-form";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { dashboardCopy } from "@/lib/dashboard-copy";

interface ProfilePageData {
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
}

const pageCopy = {
  ar: {
    eyebrow: "الملف الشخصي",
    description: "حدّث الاسم المعروض والصورة والنبذة والمعلومات الأساسية الخاصة بك.",
    failedTitle: "تعذر تحميل الملف الشخصي",
    failedDescription: "تعذر تحميل بيانات الملف الشخصي.",
  },
  en: {
    eyebrow: "Profile",
    description: "Update your display name, avatar, bio, and core personal information.",
    failedTitle: "Failed to load profile",
    failedDescription: "Failed to load profile data.",
  },
} as const;

export default async function DashboardProfilePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  let data: ProfilePageData | null = null;
  let error: string | null = null;

  try {
    data = await dashboardApiGet<ProfilePageData>("/api/auth/me");
  } catch (requestError) {
    error =
      requestError instanceof Error
        ? requestError.message
        : p.failedDescription;
  }

  if (!data || error) {
    return (
      <section className="dashboard-panel">
          <ErrorState
            title={p.failedTitle}
            description={error ?? p.failedDescription}
          />
        </section>
    );
  }

  const profile = data.user.profile;

  return (
    <section
        className="dashboard-panel"
        style={{
          display: "grid",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "6px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7dd3fc",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {p.eyebrow}
          </p>

          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>
            {t.profile}
          </h1>

          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
            {p.description}
          </p>
        </div>

        <SettingsForm
          displayName={profile?.displayName ?? data.user.username}
          bio={profile?.bio ?? null}
          avatarUrl={profile?.avatarUrl ?? null}
          locale={profile?.locale ?? locale}
          timezone={profile?.timezone ?? "Asia/Bahrain"}
        />
      </section>
  );
}
