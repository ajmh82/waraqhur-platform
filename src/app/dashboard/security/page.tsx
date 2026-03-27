import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { dashboardCopy } from "@/lib/dashboard-copy";

interface SecurityPageData {
  session?: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

const pageCopy = {
  ar: {
    eyebrow: "الأمان",
    description: "مراجعة بيانات الجلسة الحالية لحماية الحساب.",
    failedTitle: "تعذر تحميل صفحة الأمان",
    failedDescription: "تعذر تحميل بيانات الأمان.",
    currentSession: "الجلسة الحالية",
    sessionId: "معرّف الجلسة",
    expiresAt: "انتهاء الجلسة",
    lastUsedAt: "آخر استخدام",
    na: "غير متوفر",
  },
  en: {
    eyebrow: "Security",
    description: "Review current session data to keep your account secure.",
    failedTitle: "Failed to load security page",
    failedDescription: "Failed to load security data.",
    currentSession: "Current Session",
    sessionId: "Session ID",
    expiresAt: "Session Expires",
    lastUsedAt: "Last Used",
    na: "Not available",
  },
} as const;

export default async function DashboardSecurityPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  let data: SecurityPageData | null = null;
  let error: string | null = null;

  try {
    data = await apiGet<SecurityPageData>("/api/auth/me");
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : p.failedDescription;
  }

  if (!data || error) {
    return (
      <AppShell>
        <section className="dashboard-panel">
          <ErrorState title={p.failedTitle} description={error ?? p.failedDescription} />
        </section>
      </AppShell>
    );
  }

  const session = data.session ?? null;

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "grid", gap: "6px" }}>
          <p style={{ margin: 0, color: "#7dd3fc", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {p.eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{t.security}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{p.description}</p>
        </div>

        <article className="dashboard-card" style={{ padding: "18px", display: "grid", gap: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>{p.currentSession}</h2>
          <div><strong>{p.sessionId}:</strong> {session?.id ?? p.na}</div>
          <div><strong>{p.expiresAt}:</strong> {session?.expiresAt ?? p.na}</div>
          <div><strong>{p.lastUsedAt}:</strong> {session?.lastUsedAt ?? p.na}</div>
        </article>
      </section>
    </AppShell>
  );
}
