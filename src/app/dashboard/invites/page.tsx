import { dashboardApiGet } from "@/lib/dashboard-api";

type InviteRow = { id: string; email: string; status: string; createdAt: string };
type InviteData = { remaining: number; total: number; sent: InviteRow[] };

function toSafeNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default async function DashboardInvitesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    invitationId?: string;
    inviteId?: string;
    invite?: string;
    token?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const isAr = true;

  let data: InviteData = { remaining: 5, total: 5, sent: [] };
  try {
    const raw = await dashboardApiGet<{
      remaining?: number;
      total?: number;
      sent?: Array<{ id: string; email?: string; status?: string; createdAt?: string }>;
      quota?: { remaining?: number; total?: number };
      invitations?: Array<{ id: string; inviteeEmail?: string; email?: string; status?: string; createdAt?: string }>;
    }>("/api/invitations");

    const quota = raw?.quota ?? {};
    const invitations = Array.isArray(raw?.invitations) ? raw.invitations : [];
    const sentLegacy = Array.isArray(raw?.sent) ? raw.sent : [];

    const normalizedFromInvites: InviteRow[] = invitations.map((x) => ({
      id: String(x.id ?? ""),
      email: String(x.inviteeEmail ?? x.email ?? ""),
      status: String(x.status ?? "pending"),
      createdAt: String(x.createdAt ?? new Date().toISOString()),
    })).filter((x) => x.id && x.email);

    const normalizedLegacy: InviteRow[] = sentLegacy.map((x) => ({
      id: String(x.id ?? ""),
      email: String(x.email ?? ""),
      status: String(x.status ?? "pending"),
      createdAt: String(x.createdAt ?? new Date().toISOString()),
    })).filter((x) => x.id && x.email);

    data = {
      remaining: toSafeNumber(raw?.remaining ?? quota.remaining, 5),
      total: toSafeNumber(raw?.total ?? quota.total, 5),
      sent: normalizedFromInvites.length > 0 ? normalizedFromInvites : normalizedLegacy,
    };
  } catch {
    data = { remaining: 5, total: 5, sent: [] };
  }

  const statusText: Record<string, string> = {
    sent: "تم إرسال الدعوة بنجاح.",
    invalid_email: "البريد الإلكتروني غير صالح.",
    no_quota: "لا يوجد رصيد دعوات متاح.",
    create_failed: "تعذر إنشاء الدعوة. تحقق من البريد أو حاول لاحقًا.",
    failed: "فشل إرسال الدعوة.",
  };

  const inviteId =
    params.invitationId ?? params.inviteId ?? params.token ?? params.invite ?? null;
  const inviteLink = inviteId
    ? `/accept-invitation?invitationId=${encodeURIComponent(inviteId)}`
    : null;

  return (
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

        {inviteLink ? (
          <div className="dashboard-list-item" style={{ gap: 8 }}>
            <span className="dashboard-list-item__title">
              {isAr ? "رابط الدعوة للمشاركة" : "Shareable invite link"}
            </span>
            <input
              className="settings-form__input"
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
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
  );
}
