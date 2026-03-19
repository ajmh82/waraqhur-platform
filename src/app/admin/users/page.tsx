import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminUsersResponse {
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
}

interface AdminUsersPageResult {
  data: AdminUsersResponse | null;
  error: string | null;
}

async function loadAdminUsersPageData(): Promise<AdminUsersPageResult> {
  try {
    const data = await dashboardApiGet<AdminUsersResponse>("/api/admin/users");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load admin users list.",
    };
  }
}

export default async function AdminUsersPage() {
  const { data, error } = await loadAdminUsersPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load users"
        description={error ?? "Unable to load admin users list."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Users management"
        description="A protected users directory for administration, designed to scale later with filtering, actions, and role operations."
      />

      {data.users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No users are available for administration yet."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Last activity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-table__primary">
                      {user.profile?.displayName ?? user.username}
                    </div>
                    <div className="admin-table__secondary">{user.username}</div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.roles[0]?.name ?? "No role"}</td>
                  <td>{user.status}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString("en-GB")}</td>
                  <td>
                    {user.lastActivityAt
                      ? new Date(user.lastActivityAt).toLocaleString("en-GB")
                      : "No activity"}
                  </td>
                  <td>
                    <AdminUserActions
                      user={{
                        id: user.id,
                        email: user.email,
                        status: user.status,
                      }}
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
