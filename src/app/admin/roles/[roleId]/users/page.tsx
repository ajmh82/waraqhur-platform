import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminRolesResponse {
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
}

interface AdminRoleUsersPageResult {
  role: AdminRolesResponse["roles"][number] | null;
  error: string | null;
}

async function loadAdminRoleUsersPageData(
  roleId: string
): Promise<AdminRoleUsersPageResult> {
  try {
    const data = await dashboardApiGet<AdminRolesResponse>("/api/admin/roles");
    const role = data.roles.find((item) => item.id === roleId) ?? null;

    return {
      role,
      error: null,
    };
  } catch (error) {
    return {
      role: null,
      error:
        error instanceof Error ? error.message : "Unable to load role users.",
    };
  }
}

export default async function AdminRoleUsersPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const { role, error } = await loadAdminRoleUsersPageData(roleId);

  if (error) {
    return <ErrorState title="Failed to load role users" description={error} />;
  }

  if (!role) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`مستخدمو الدور: ${role.name}`}
        description="عرض جميع المستخدمين المرتبطين بهذا الدور."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/roles/${role.id}`} className="btn small">
          العودة إلى تفاصيل الدور
        </Link>
      </div>

      {role.users.length === 0 ? (
        <EmptyState
          title="لا يوجد مستخدمون"
          description="لا يوجد مستخدمون مرتبطون بهذا الدور."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>اسم المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الحالة</th>
                <th>تاريخ الإسناد</th>
              </tr>
            </thead>
            <tbody>
              {role.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.status}</td>
                  <td>{new Date(user.assignedAt).toLocaleString("ar-BH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
