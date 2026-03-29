import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { BlockedUsersManager } from "@/components/settings/blocked-users-manager";

export default async function BlockedUsersPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  return (
    <AppShell>
      <section className="page-section" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>
          {locale === "en" ? "Blocked Users" : "المستخدمون المحظورون"}
        </h1>
        <BlockedUsersManager locale={locale} />
      </section>
    </AppShell>
  );
}
