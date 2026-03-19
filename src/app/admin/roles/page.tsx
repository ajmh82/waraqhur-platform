import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface PermissionsCheckResponse {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
  };
  authorization: {
    userId: string;
    roles: string[];
    permissions: string[];
  };
}

interface AdminRolesPageResult {
  data: PermissionsCheckResponse | null;
  error: string | null;
}

async function loadAdminRolesPageData(): Promise<AdminRolesPageResult> {
  try {
    const data =
      await dashboardApiGet<PermissionsCheckResponse>(
        "/api/admin/permissions-check"
      );
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

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Roles and permissions"
        description="The current administrative authorization snapshot, ready to evolve later into full role and permission management."
      />

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Current admin user</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Username</dt>
              <dd>{data.user.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{data.user.status}</dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Assigned roles</h3>
          {data.authorization.roles.length === 0 ? (
            <EmptyState
              title="No roles found"
              description="No roles are assigned to this administrative user."
            />
          ) : (
            <div className="admin-chip-list">
              {data.authorization.roles.map((role) => (
                <span key={role} className="badge-chip badge-chip--soft">
                  {role}
                </span>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-card">
          <h3>Effective permissions</h3>
          {data.authorization.permissions.length === 0 ? (
            <EmptyState
              title="No permissions found"
              description="No permissions are assigned to this administrative user."
            />
          ) : (
            <div className="admin-chip-list">
              {data.authorization.permissions.map((permission) => (
                <span key={permission} className="badge-chip">
                  {permission}
                </span>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
