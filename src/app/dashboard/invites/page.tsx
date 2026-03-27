import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { dashboardCopy } from "@/lib/dashboard-copy";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface InviteItem {
  id: string;
  email: string;
  status: string;
  createdAt?: string;
  expiresAt?: string | null;
}

interface InvitesResponse {
  data?: {
    invitations?: InviteItem[];
    invites?: InviteItem[];
  };
  invitations?: InviteItem[];
  invites?: InviteItem[];
}

const pageCopy = {
  ar: {
    eyebrow: "الدعوات",
    description: "راجع دعواتك الحالية وحالتها.",
    failedTitle: "تعذر تحميل الدعوات",
    failedDescription: "تعذر تحميل بيانات الدعوات.",
    empty: "لا توجد دعوات حالياً.",
    email: "البريد",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    expiresAt: "تاريخ الانتهاء",
    na: "غير متوفر",
  },
  en: {
    eyebrow: "Invites",
    description: "Review your current invitations and status.",
    failedTitle: "Failed to load invites",
    failedDescription: "Failed to load invites data.",
    empty: "No invites right now.",
    email: "Email",
    status: "Status",
    createdAt: "Created At",
    expiresAt: "Expires At",
    na: "Not available",
  },
} as const;

function extractInvites(payload: InvitesResponse | null | undefined): InviteItem[] {
  if (!payload) return [];
  if (payload.data?.invitations) return payload.data.invitations;
  if (payload.data?.invites) return payload.data.invites;
  if (payload.invitations) return payload.invitations;
  if (payload.invites) return payload.invites;
  return [];
}

export default async function DashboardInvitesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  let data: InvitesResponse | null = null;
  let error: string | null = null;

  try {
    data = await apiGet<InvitesResponse>("/api/invitations");
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

  const invitations = extractInvites(data);

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "grid", gap: "6px" }}>
          <p style={{ margin: 0, color: "#7dd3fc", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {p.eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{t.invites}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{p.description}</p>
        </div>

        {invitations.length === 0 ? (
          <div className="dashboard-card" style={{ padding: "18px", color: "var(--muted)" }}>
            {p.empty}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {invitations.map((invite) => (
              <article key={invite.id} className="dashboard-card" style={{ padding: "16px", display: "grid", gap: "8px" }}>
                <div><strong>{p.email}:</strong> {invite.email}</div>
                <div><strong>{p.status}:</strong> {invite.status}</div>
                <div>
                  <strong>{p.createdAt}:</strong>{" "}
                  {invite.createdAt
                    ? formatDateTimeInMakkah(invite.createdAt, locale === "en" ? "en-US" : "ar-BH")
                    : p.na}
                </div>
                <div>
                  <strong>{p.expiresAt}:</strong>{" "}
                  {invite.expiresAt
                    ? formatDateTimeInMakkah(invite.expiresAt, locale === "en" ? "en-US" : "ar-BH")
                    : p.na}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
