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

interface AdminRoleDetailsPageResult {
  role: AdminRolesResponse["roles"][number] | null;
  error: string | null;
}

async function loadAdminRoleDetailsPageData(
  roleId: string
): Promise<AdminRoleDetailsPageResult> {
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
        error instanceof Error ? error.message : "Unable to load role details.",
    };
  }
}

export default async function AdminRoleDetailsPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const { role, error } = await loadAdminRoleDetailsPageData(roleId);

  if (error) {
    return <ErrorState title="Failed to load role" description={error} />;
  }

  if (!role) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={role.name}
        description="تفاصيل الدور والصلاحيات المرتبطة به."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href="/admin/roles" className="btn small">
          العودة إلى الأدوار
        </Link>
        <Link href={`/admin/roles/${role.id}/users`} className="btn small">
          Role Users
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>الاسم:</strong> {role.name}</p>
          <p><strong>Key:</strong> {role.key}</p>
          <p><strong>الوصف:</strong> {role.description ?? "-"}</p>
          <p><strong>نوع الدور:</strong> {role.isSystem ? "System" : "Custom"}</p>
          <p><strong>عدد المستخدمين:</strong> {role.usersCount}</p>
          <p><strong>تاريخ الإنشاء:</strong> {new Date(role.createdAt).toLocaleString("ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {new Date(role.updatedAt).toLocaleString("ar-BH")}</p>
        </div>
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>الصلاحيات</h2>

        {role.permissions.length === 0 ? (
          <EmptyState
            title="لا توجد صلاحيات"
            description="لا توجد صلاحيات مرتبطة بهذا الدور."
          />
        ) : (
          <div className="admin-chip-list">
            {role.permissions.map((permission) => (
              <span key={permission} className="badge-chip">
                {permission}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
