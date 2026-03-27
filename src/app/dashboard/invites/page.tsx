import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

type InviteRow = { id: string; email: string; status: string; createdAt: string };
type InviteData = { remaining: number; total: number; sent: InviteRow[] };

export default async function DashboardInvitesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isAr = true;

  let data: InviteData = { remaining: 5, total: 5, sent: [] };
  try {
    data = await dashboardApiGet<InviteData>("/api/invitations");
  } catch {}

  const statusText: Record<string, string> = {
    sent: "تم إرسال الدعوة بنجاح.",
    invalid_email: "البريد الإلكتروني غير صالح.",
    no_quota: "لا يوجد رصيد دعوات متاح.",
    failed: "فشل إرسال الدعوة.",
  };

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>{isAr ? "الدعوات" : "Invites"}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isAr
            ? "لكل مستخدم 5 دعوات افتراضيًا، ويمكن للإدمن زيادة العدد."
            : "Each user has 5 invites by default; admin can increase quota."}
        </p>

        {params.status && statusText[params.status] ? (
          <p style={{ margin: 0, color: params.status === "sent" ? "#86efac" : "var(--danger)" }}>
            {statusText[params.status]}
          </p>
        ) : null}

        <div className="dashboard-list-item">
          <span className="dashboard-list-item__title">
            {isAr ? "الرصيد المتبقي" : "Remaining quota"}: {data.remaining} / {data.total}
          </span>
        </div>

        <form action="/api/invitations" method="post" className="settings-form" style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{isAr ? "إيميل الشخص المدعو" : "Invitee email"}</span>
            <input className="settings-form__input" type="email" name="email" required />
          </label>
          <button className="settings-form__submit" type="submit">
            {isAr ? "إرسال دعوة" : "Send invite"}
          </button>
        </form>

        <div className="dashboard-list-nav">
          {data.sent.length === 0 ? (
            <div className="dashboard-list-item">
              <span className="dashboard-list-item__body">
                {isAr ? "لا توجد دعوات مرسلة حتى الآن." : "No sent invites yet."}
              </span>
            </div>
          ) : (
            data.sent.map((x) => (
              <div key={x.id} className="dashboard-list-item">
                <span className="dashboard-list-item__title">{x.email}</span>
                <span className="dashboard-list-item__body">
                  {x.status} • {new Date(x.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
