import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserRoleRemoveButton } from "@/components/admin/admin-user-role-remove-button";
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
      lastActivityAt: string | null;
    }>;
  };
}

interface AdminUserRolesPageResult {
  user: AdminUsersResponse["data"]["users"][number] | null;
  error: string | null;
}

async function loadAdminUserRolesPageData(
  userId: string
): Promise<AdminUserRolesPageResult> {
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
        error instanceof Error ? error.message : "Unable to load user roles.",
    };
  }
}

export default async function AdminUserRolesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, error } = await loadAdminUserRolesPageData(userId);

  if (error) {
    return <ErrorState title="Failed to load user roles" description={error} />;
  }

  if (!user) {
    notFound();
  }

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const totalRoles = roles.length;
  const uniqueRoles = new Set(roles.map((role) => role.key)).size;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`أدوار المستخدم: ${user.profile?.displayName ?? user.username}`}
        description="عرض جميع الأدوار المرتبطة بهذا المستخدم."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>إجمالي الأدوار</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalRoles}</p>
        </div>
        <div className="state-card">
          <strong>الأدوار الفريدة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{uniqueRoles}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> user={user.profile?.displayName ?? user.username}, totalRoles={totalRoles}, uniqueRoles={uniqueRoles}
        </p>
      </div>

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href={`/admin/users/${user.id}`} className="btn small">
          العودة إلى تفاصيل المستخدم
        </Link>
        <Link href={`/admin/users/${user.id}/assign-role`} className="btn small">
          Assign Role
        </Link>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          title="لا توجد أدوار"
          description="لا توجد أدوار مرتبطة بهذا المستخدم."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Role Key</th>
                <th>Assigned At</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={`${role.key}-${role.assignedAt}`}>
                  <td>{role.name}</td>
                  <td>{role.key}</td>
                  <td>{formatDateTimeInMakkah(role.assignedAt, "ar-BH")}</td>
                  <td>
                    <AdminUserRoleRemoveButton
                      userId={user.id}
                      roleKey={role.key}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
