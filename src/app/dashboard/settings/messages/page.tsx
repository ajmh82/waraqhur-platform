import { cookies } from "next/headers";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { MessagesSettingsForm } from "@/components/settings/messages-settings-form";

type AccountData = {
  user: {
    directMessagesEnabled?: boolean;
  };
};

export default async function DashboardMessagesSettingsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const isAr = locale !== "en";

  let data: AccountData | null = null;
  try {
    data = await dashboardApiGet<AccountData>("/api/auth/me");
  } catch {
    data = null;
  }

  return (
    <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
      <h1 style={{ margin: 0 }}>
        {isAr ? "إعدادات الرسائل" : "Messages Settings"}
      </h1>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        {isAr
          ? "يمكنك قفل الرسائل الخاصة ومنع استقبال طلبات المحادثة."
          : "You can close direct messages and stop receiving chat requests."}
      </p>

      <MessagesSettingsForm
        locale={locale}
        initialEnabled={Boolean(data?.user?.directMessagesEnabled ?? true)}
      />
    </section>
  );
}
