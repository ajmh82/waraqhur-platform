import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasAnyPermission } from "@/services/authorization-service";

interface AdminAccessResult {
  allowed: boolean;
  redirectTo: string | null;
}

async function checkAdminAccess(): Promise<AdminAccessResult> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return { allowed: false, redirectTo: "/" };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const hasAdminAccess = await userHasAnyPermission(current.user.id, [
      "users.manage", "invites.read", "roles.read", "sources.manage",
      "comments.moderate", "audit.read", "categories.manage", "posts.update",
    ]);

    if (!hasAdminAccess) {
      return { allowed: false, redirectTo: "/dashboard/profile" };
    }

    return { allowed: true, redirectTo: null };
  } catch {
    return { allowed: false, redirectTo: "/" };
  }
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const access = await checkAdminAccess();

  if (!access.allowed) {
    redirect(access.redirectTo ?? "/");
  }

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />
        <section className="dashboard-shell">
          <aside className="dashboard-shell__sidebar">
            <div className="dashboard-shell__sidebar-card">
              <p className="section-heading__eyebrow">لوحة الإدارة</p>
              <h1 className="dashboard-shell__title">مساحة الإدارة</h1>
              <p className="dashboard-shell__description">
                إدارة المستخدمين والدعوات والأدوار والمصادر والتصنيفات والمنشورات والتعليقات وسجل العمليات من مكان واحد محمي.
              </p>
            </div>
            <AdminNav />
          </aside>
          <section className="dashboard-shell__content">{children}</section>
        </section>
      </div>
    </main>
  );
}
