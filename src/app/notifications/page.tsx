import { AppShell } from "@/components/layout/app-shell";

export default function NotificationsPage() {
  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>الإشعارات</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          هنا تجد أحدث التنبيهات المرتبطة بحسابك وتقدر تدير حالتها.
        </p>
      </section>
    </AppShell>
  );
}
