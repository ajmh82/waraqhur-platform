import type { ReactNode } from "react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="page-stack page-stack--social">
      <div className="page-container page-container--social">
        <section className="dashboard-shell">
          <aside className="dashboard-shell__sidebar">
            <div className="dashboard-shell__sidebar-card">
              <p className="eyebrow" style={{ margin: 0 }}>
                Dashboard
              </p>
              <h2 style={{ margin: "6px 0 0" }}>لوحة المستخدم</h2>
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
                مركز الوصول السريع إلى الحساب، النشاط، الرسائل، الإعدادات،
                والإشعارات.
              </p>
            </div>

            <nav className="dashboard-shell__nav">
              <Link href="/dashboard" className="dashboard-shell__nav-item">
                الرئيسية
              </Link>
              <Link href="/dashboard/profile" className="dashboard-shell__nav-item">
                الملف الشخصي
              </Link>
              <Link href="/dashboard/account" className="dashboard-shell__nav-item">
                الحساب
              </Link>
              <Link href="/dashboard/settings" className="dashboard-shell__nav-item">
                الإعدادات
              </Link>
              <Link href="/dashboard/security" className="dashboard-shell__nav-item">
                الأمان
              </Link>
              <Link href="/dashboard/activity" className="dashboard-shell__nav-item">
                النشاط
              </Link>
              <Link href="/dashboard/notifications" className="dashboard-shell__nav-item">
                الإشعارات
              </Link>
              <Link href="/dashboard/invites" className="dashboard-shell__nav-item">
                الدعوات
              </Link>
              <Link href="/messages" className="dashboard-shell__nav-item">
                الرسائل
              </Link>
              <Link href="/search" className="dashboard-shell__nav-item">
                البحث
              </Link>
            </nav>
          </aside>

          <section className="dashboard-shell__content">{children}</section>
        </section>
      </div>
    </main>
  );
}
