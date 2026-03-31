import { cookies } from "next/headers";
import { dashboardApiGet } from "@/lib/dashboard-api";

type AccountData = {
  user: {
    id: string;
    email: string;
    username: string;
    profile?: { displayName?: string | null } | null;
    directMessagesEnabled?: boolean;
  };
};

export default async function DashboardAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const isAr = cookieStore.get("locale")?.value !== "en";

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
    username_limit: "مسموح التغيير مرتين في السنة فقط.",
    duplicate: "البريد الإلكتروني أو اسم المستخدم مستخدم مسبقًا.",
    dm_saved: "تم تحديث إعدادات الرسائل الخاصة.",
    failed: "حدث خطأ أثناء الحفظ.",
    not_found: "تعذر العثور على المستخدم.",
  };

  const statusMsg = params.status ? statusText[params.status] : "";

  if (!data) {
    return (
      <section className="dashboard-panel" style={{ display: "grid", gap: 10 }}>
          <h1 style={{ margin: 0 }}>{isAr ? "الحساب" : "Account"}</h1>
          {statusMsg ? <p style={{ margin: 0, color: "var(--danger)" }}>{statusMsg}</p> : null}
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {isAr ? "تعذر تحميل بيانات الحساب حالياً." : "Unable to load account data right now."}
          </p>
        </section>
    );
  }

  const displayName = data.user.profile?.displayName ?? data.user.username;

  return (
    <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>{isAr ? "الحساب" : "Account"}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isAr ? "يمكنك تعديل البريد الإلكتروني واسم المستخدم والاسم المستعار." : "You can update email, username, and nickname."}
        </p>

        {statusMsg ? (
          <p style={{ margin: 0, color: params.status === "saved" ? "#86efac" : "var(--danger)" }}>
            {statusMsg}
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
            <small style={{ color: "var(--muted)" }}>{isAr ? "مسموح التغيير مرتين في السنة فقط." : "Allowed to change twice per year."}</small>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{isAr ? "الاسم المستعار" : "Nickname"}</span>
            <input className="settings-form__input" type="text" name="displayName" defaultValue={displayName} required />
          </label>

          <button className="settings-form__submit" type="submit">{isAr ? "حفظ التغييرات" : "Save changes"}</button>
        </form>


        <form className="settings-form" action="/api/preferences/messages" method="post" style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              name="directMessagesEnabled"
              defaultChecked={Boolean(data.user.directMessagesEnabled ?? true)}
            />
            <span>{isAr ? "السماح بطلبات الرسائل الخاصة" : "Allow private message requests"}</span>
          </label>
          <button className="settings-form__submit" type="submit">
            {isAr ? "حفظ إعدادات الرسائل" : "Save messaging settings"}
          </button>
        </form>

      </section>
  );
}
