import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserRoleAssignmentForm } from "@/components/admin/admin-user-role-assignment-form";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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

interface AdminRolesResponse {
  data: {
    roles: Array<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      isSystem: boolean;
      usersCount: number;
      users: Array<{
        id: string;
        email: string;
        username: string;
        status: string;
        assignedAt: string;
      }>;
      permissions: string[];
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

interface AdminAssignRolePageResult {
  user: AdminUsersResponse["data"]["users"][number] | null;
  roles: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
  }>;
  error: string | null;
}

async function loadAdminAssignRolePageData(
  userId: string
): Promise<AdminAssignRolePageResult> {
  try {
    const [usersResponse, rolesResponse] = await Promise.all([
      dashboardApiGet<AdminUsersResponse>("/api/admin/users"),
      dashboardApiGet<AdminRolesResponse>("/api/admin/roles"),
    ]);

    const users = Array.isArray(usersResponse.data.users)
      ? usersResponse.data.users
      : [];
    const allRoles = Array.isArray(rolesResponse.data.roles)
      ? rolesResponse.data.roles
      : [];

    const user = users.find((item) => item.id === userId) ?? null;

    if (!user) {
      return {
        user: null,
        roles: [],
        error: null,
      };
    }

    const assignedRoleKeys = new Set(user.roles.map((role) => role.key));

    return {
      user,
      roles: allRoles
        .filter((role) => !assignedRoleKeys.has(role.key))
        .map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
        })),
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      roles: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل صفحة إسناد الدور.",
    };
  }
}

export default async function AdminAssignRolePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, roles, error } = await loadAdminAssignRolePageData(userId);

  if (error) {
    return <ErrorState title="تعذر تحميل الصفحة" description={error} />;
  }

  if (!user) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`إسناد دور للمستخدم: ${user.profile?.displayName ?? user.username}`}
        description="إسناد دور جديد لهذا المستخدم من داخل لوحة الإدارة."
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
          <strong>الأدوار المتاحة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{roles.length}</p>
        </div>
        <div className="state-card">
          <strong>أدوار المستخدم الحالية</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{user.roles.length}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> user={user.username}, assignedRoles={user.roles.length}, availableRoles={roles.length}
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
        <Link href={`/admin/users/${user.id}/roles`} className="btn small">
          User Roles
        </Link>
        <Link href={`/admin/users/${user.id}/permissions`} className="btn small">
          User Permissions
        </Link>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          title="لا توجد أدوار متاحة للإسناد"
          description="هذا المستخدم لديه بالفعل كل الأدوار المتاحة حاليًا."
        />
      ) : (
        <AdminUserRoleAssignmentForm
          user={{
            id: user.id,
            username: user.username,
          }}
          roles={roles}
        />
      )}
    </section>
  );
}
