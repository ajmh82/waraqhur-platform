import Link from "next/link";
import { notFound } from "next/navigation";
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

interface AdminUserPermissionsPageResult {
  user: AdminUsersResponse["data"]["users"][number] | null;
  permissions: string[];
  error: string | null;
}

async function loadAdminUserPermissionsPageData(
  userId: string
): Promise<AdminUserPermissionsPageResult> {
  try {
    const [usersResponse, rolesResponse] = await Promise.all([
      dashboardApiGet<AdminUsersResponse>("/api/admin/users"),
      dashboardApiGet<AdminRolesResponse>("/api/admin/roles"),
    ]);

    const users = Array.isArray(usersResponse.data.users)
      ? usersResponse.data.users
      : [];
    const roles = Array.isArray(rolesResponse.data.roles)
      ? rolesResponse.data.roles
      : [];

    const user = users.find((item) => item.id === userId) ?? null;

    if (!user) {
      return {
        user: null,
        permissions: [],
        error: null,
      };
    }

    const userRoleKeys = new Set(user.roles.map((role) => role.key));
    const permissions = Array.from(
      new Set(
        roles
          .filter((role) => userRoleKeys.has(role.key))
          .flatMap((role) => role.permissions)
      )
    ).sort();

    return {
      user,
      permissions,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      permissions: [],
      error:
        error instanceof Error ? error.message : "Unable to load user permissions.",
    };
  }
}

export default async function AdminUserPermissionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, permissions, error } =
    await loadAdminUserPermissionsPageData(userId);

  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل الصلاحيات"
        description={error}
      />
    );
  }

  if (!user) {
    notFound();
  }

  const roles = Array.isArray(user.roles) ? user.roles : [];

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`صلاحيات المستخدم: ${user.profile?.displayName ?? user.username}`}
        description="عرض الصلاحيات الفعلية الناتجة من جميع أدوار هذا المستخدم."
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
          <strong>إجمالي الصلاحيات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {permissions.length}
          </p>
        </div>
        <div className="state-card">
          <strong>عدد الأدوار</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {roles.length}
          </p>
        </div>
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
          أدوار المستخدم
        </Link>
        <Link href={`/admin/users/${user.id}/assign-role`} className="btn small">
          إسناد دور
        </Link>
      </div>

      {permissions.length === 0 ? (
        <EmptyState
          title="لا توجد صلاحيات"
          description="لا توجد صلاحيات فعليّة مرتبطة بهذا المستخدم."
        />
      ) : (
        <div className="state-card">
          <div className="admin-chip-list">
            {permissions.map((permission) => (
              <span key={permission} className="badge-chip">
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
