import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { dashboardCopy } from "@/lib/dashboard-copy";

interface AccountPageData {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    createdAt?: string;
    profile: {
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      locale: string | null;
      timezone: string | null;
    } | null;
  };
  session?: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

const pageCopy = {
  ar: {
    eyebrow: "الحساب",
    description: "هذه الصفحة تعرض بيانات الحساب الأساسية المرتبطة بتسجيل الدخول والملف الشخصي.",
    failedTitle: "تعذر تحميل الحساب",
    failedDescription: "تعذر تحميل بيانات الحساب.",
    email: "البريد الإلكتروني",
    username: "اسم المستخدم",
    status: "الحالة",
    sessionId: "معرّف الجلسة",
    sessionExpires: "انتهاء الجلسة",
    sessionLastUsed: "آخر استخدام",
    notAvailable: "غير متوفر",
  },
  en: {
    eyebrow: "Account",
    description: "This page shows the core account information related to sign-in and your profile.",
    failedTitle: "Failed to load account",
    failedDescription: "Failed to load account data.",
    email: "Email",
    username: "Username",
    status: "Status",
    sessionId: "Session ID",
    sessionExpires: "Session Expires",
    sessionLastUsed: "Last Used",
    notAvailable: "Not available",
  },
} as const;

function FieldCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article
      className="dashboard-card"
      style={{
        padding: "18px",
        display: "grid",
        gap: "6px",
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontSize: "13px",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          fontSize: "15px",
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </article>
  );
}

export default async function DashboardAccountPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  let data: AccountPageData | null = null;
  let error: string | null = null;

  try {
    data = await apiGet<AccountPageData>("/api/auth/me");
  } catch (requestError) {
    error =
      requestError instanceof Error
        ? requestError.message
        : p.failedDescription;
  }

  if (!data || error) {
    return (
      <AppShell>
        <section className="dashboard-panel">
          <ErrorState
            title={p.failedTitle}
            description={error ?? p.failedDescription}
          />
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
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
            {t.account}
          </h1>

          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
            {p.description}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <FieldCard label={p.email} value={data.user.email} />
          <FieldCard label={p.username} value={data.user.username} />
          <FieldCard label={p.status} value={data.user.status} />
          <FieldCard
            label={p.sessionId}
            value={data.session?.id ?? p.notAvailable}
          />
          <FieldCard
            label={p.sessionExpires}
            value={data.session?.expiresAt ?? p.notAvailable}
          />
          <FieldCard
            label={p.sessionLastUsed}
            value={data.session?.lastUsedAt ?? p.notAvailable}
          />
        </div>
      </section>
    </AppShell>
  );
}
