import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminUsersResponse {
  data: {
    users: Array<{
      id: string;
      email: string;
      username: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      profile: {
        displayName: string;
      } | null;
      roles: Array<{
        key: string;
        name: string;
        assignedAt: string;
      }>;
      sessions: Array<{
        id: string;
        createdAt: string;
        lastUsedAt: string;
        expiresAt: string;
      }>;
      lastActivityAt: string | null;
    }>;
  };
}

interface AdminUserDetailsPageResult {
  user: AdminUsersResponse["data"]["users"][number] | null;
  error: string | null;
}

async function loadAdminUserDetailsPageData(
  userId: string
): Promise<AdminUserDetailsPageResult> {
  try {
    const response = await dashboardApiGet<AdminUsersResponse>("/api/admin/users");
    const users = Array.isArray(response.data.users) ? response.data.users : [];
    const user = users.find((item) => item.id === userId) ?? null;

    return {
      user,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error:
        error instanceof Error ? error.message : "Unable to load user details.",
    };
  }
}

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, error } = await loadAdminUserDetailsPageData(userId);

  if (error) {
    return <ErrorState title="Failed to load user" description={error} />;
  }

  if (!user) {
    notFound();
  }

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const sessions = Array.isArray(user.sessions) ? user.sessions : [];

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={user.profile?.displayName ?? user.username}
        description="تفاصيل المستخدم من داخل لوحة الإدارة."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/users" className="btn small">
          العودة إلى المستخدمين
        </Link>
        <Link href={`/admin/users/${user.id}/roles`} className="btn small">
          User Roles
        </Link>
        <Link href={`/admin/users/${user.id}/permissions`} className="btn small">
          User Permissions
        </Link>
        <Link href={`/admin/users/${user.id}/activity`} className="btn small">
          User Activity
        </Link>
        <Link href={`/admin/users/${user.id}/sessions`} className="btn small">
          User Sessions
        </Link>
        <Link href={`/admin/users/${user.id}/assign-role`} className="btn small">
          Assign Role
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>الحالة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{user.status}</p>
        </div>
        <div className="state-card">
          <strong>عدد الأدوار</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{roles.length}</p>
        </div>
        <div className="state-card">
          <strong>عدد الجلسات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sessions.length}</p>
        </div>
        <div className="state-card">
          <strong>آخر نشاط</strong>
          <p style={{ fontSize: "16px", margin: "10px 0 0" }}>
            {user.lastActivityAt
              ? formatDateTimeInMakkah(user.lastActivityAt, "ar-BH")
              : "No activity"}
          </p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> user={user.username}, status={user.status}, roles={roles.length}, sessions={sessions.length}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>اسم المستخدم:</strong> {user.username}</p>
          <p><strong>الاسم الظاهر:</strong> {user.profile?.displayName ?? "-"}</p>
          <p><strong>البريد الإلكتروني:</strong> {user.email}</p>
          <p><strong>الحالة:</strong> {user.status}</p>
          <p><strong>عدد الجلسات:</strong> {sessions.length}</p>
          <p>
            <strong>آخر نشاط:</strong>{" "}
            {user.lastActivityAt
              ? formatDateTimeInMakkah(user.lastActivityAt, "ar-BH")
              : "No activity"}
          </p>
          <p><strong>تاريخ التسجيل:</strong> {formatDateTimeInMakkah(user.createdAt, "ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {formatDateTimeInMakkah(user.updatedAt, "ar-BH")}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>الأدوار</h2>

        {roles.length === 0 ? (
          <EmptyState
            title="لا توجد أدوار"
            description="لا توجد أدوار مرتبطة بهذا المستخدم."
          />
        ) : (
          <div className="admin-chip-list">
            {roles.map((role) => (
              <span key={`${role.key}-${role.assignedAt}`} className="badge-chip">
                {role.name} ({role.key})
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>إجراءات المستخدم</h2>
        <AdminUserActions
          user={{
            id: user.id,
            email: user.email,
            status: user.status,
          }}
        />
      </div>
    </section>
  );
}
