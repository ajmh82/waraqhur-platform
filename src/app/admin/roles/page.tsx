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
    permissions: string[];
    createdAt: string;
    updatedAt: string;
  }>;
}

interface AdminRolesPageResult {
  data: AdminRolesResponse | null;
  error: string | null;
}

async function loadAdminRolesPageData(): Promise<AdminRolesPageResult> {
  try {
    const data = await dashboardApiGet<AdminRolesResponse>("/api/admin/roles");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load admin roles and permissions.",
    };
  }
}

export default async function AdminRolesPage() {
  const { data, error } = await loadAdminRolesPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load roles"
        description={error ?? "Unable to load admin roles and permissions."}
      />
    );
  }

  const totalRoles = data.roles.length;
  const systemRoles = data.roles.filter((role) => role.isSystem).length;
  const totalAssignments = data.roles.reduce((sum, role) => sum + role.usersCount, 0);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Roles and permissions"
        description="عرض جميع الأدوار داخل النظام مع الصلاحيات المربوطة بكل دور."
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
          <strong>أدوار نظامية</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{systemRoles}</p>
        </div>
        <div className="state-card">
          <strong>إجمالي الإسنادات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalAssignments}</p>
        </div>
      </div>

      {data.roles.length === 0 ? (
        <EmptyState
          title="لا توجد أدوار"
          description="لا توجد أدوار معرفة داخل النظام."
        />
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {data.roles.map((role) => (
            <article key={role.id} className="state-card">
              <div style={{ display: "grid", gap: "10px" }}>
                <p style={{ margin: 0 }}>
                  <strong>{role.name}</strong> ({role.key})
                </p>
                <p style={{ margin: 0 }}>
                  <strong>الوصف:</strong> {role.description ?? "-"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>نوع الدور:</strong> {role.isSystem ? "System" : "Custom"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>عدد المستخدمين:</strong> {role.usersCount}
                </p>
                <div>
                  <strong>الصلاحيات:</strong>
                  {role.permissions.length === 0 ? (
                    <p style={{ marginTop: "8px", marginBottom: 0 }}>لا توجد صلاحيات مرتبطة بهذا الدور.</p>
                  ) : (
                    <div className="admin-chip-list" style={{ marginTop: "8px" }}>
                      {role.permissions.map((permission) => (
                        <span key={permission} className="badge-chip">
                          {permission}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
