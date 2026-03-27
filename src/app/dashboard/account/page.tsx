import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

type AccountData = {
  user: {
    id: string;
    email: string;
    username: string;
    profile?: { displayName?: string | null } | null;
  };
};

export default async function DashboardAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isAr = true;

  let data: AccountData | null = null;
  try {
    data = await dashboardApiGet<AccountData>("/api/auth/me");
  } catch {
    data = null;
  }

  const statusText: Record<string, string> = {
    saved: "تم حفظ التغييرات بنجاح.",
    invalid: "البيانات غير مكتملة.",
    username_format: "اسم المستخدم يجب أن يكون 3-24 حرفًا (a-z, 0-9, _).",
    username_limit: "يمكن تغيير اسم المستخدم مرتين فقط خلال 365 يوم.",
    duplicate: "البريد أو اسم المستخدم مستخدم مسبقًا.",
    failed: "حدث خطأ أثناء الحفظ.",
    not_found: "تعذر العثور على المستخدم.",
  };

  if (!data) {
    return (
      <AppShell>
        <section className="dashboard-panel">
          <h1 style={{ marginTop: 0 }}>{isAr ? "الحساب" : "Account"}</h1>
          <p style={{ color: "var(--danger)" }}>{isAr ? "تعذر تحميل بيانات الحساب." : "Failed to load account."}</p>
        </section>
      </AppShell>
    );
  }

  const displayName = data.user.profile?.displayName ?? data.user.username;
  const status = params.status ? statusText[params.status] : "";

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>{isAr ? "الحساب" : "Account"}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isAr
            ? "يمكنك تعديل البريد الإلكتروني واسم المستخدم والاسم المستعار."
            : "You can update email, username, and nickname."}
        </p>

        {status ? (
          <p style={{ margin: 0, color: status === statusText.saved ? "#86efac" : "var(--danger)" }}>
            {status}
          </p>
        ) : null}

        <form className="settings-form" action="/api/preferences/account" method="post" style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{isAr ? "البريد الإلكتروني" : "Email"}</span>
            <input className="settings-form__input" type="email" name="email" defaultValue={data.user.email} required />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{isAr ? "اسم المستخدم" : "Username"}</span>
            <input className="settings-form__input" type="text" name="username" defaultValue={data.user.username} required />
            <small style={{ color: "var(--muted)" }}>
              {isAr ? "مسموح مرتين خلال 365 يوم." : "Allowed twice per 365 days."}
            </small>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{isAr ? "الاسم المستعار" : "Nickname"}</span>
            <input className="settings-form__input" type="text" name="displayName" defaultValue={displayName} required />
          </label>

          <button className="settings-form__submit" type="submit">
            {isAr ? "حفظ التغييرات" : "Save changes"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
