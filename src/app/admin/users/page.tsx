import Link from "next/link";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah, formatDateInMakkah } from "@/lib/date-time";

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

interface AdminUsersPageResult {
  data: AdminUsersResponse["data"] | null;
  error: string | null;
}

type SortKey = "newest" | "oldest" | "last-activity";

const PAGE_SIZE = 10;

async function loadAdminUsersPageData(): Promise<AdminUsersPageResult> {
  try {
    const response = await dashboardApiGet<AdminUsersResponse>("/api/admin/users");
    return { data: response.data, error: null };
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

function buildFilterHref(
  status: string,
  role: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (role !== "ALL") {
    params.set("role", role);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  if (sort !== "newest") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/admin/users?${queryString}` : "/admin/users";
}

function getSortedUsers(
  users: AdminUsersResponse["data"]["users"],
  sort: SortKey
) {
  const nextUsers = [...users];

  if (sort === "oldest") {
    nextUsers.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return nextUsers;
  }

  if (sort === "last-activity") {
    nextUsers.sort((a, b) => {
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime;
    });
    return nextUsers;
  }

  nextUsers.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return nextUsers;
}

function getSortLabel(sort: SortKey) {
  if (sort === "oldest") {
    return "Oldest First";
  }

  if (sort === "last-activity") {
    return "Last Activity";
  }

  return "Newest First";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    role?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminUsersPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedRole = currentSearchParams.role?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ||
    currentSearchParams.sort?.trim() === "last-activity"
      ? (currentSearchParams.sort.trim() as SortKey)
      : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load users"
        description={error ?? "Unable to load admin users list."}
      />
    );
  }

  const totalUsers = data.users.length;
  const activeUsers = data.users.filter((user) => user.status === "ACTIVE").length;
  const suspendedUsers = data.users.filter((user) => user.status === "SUSPENDED").length;
  const statuses = Array.from(new Set(data.users.map((user) => user.status))).sort();
  const roleKeys = Array.from(
    new Set(data.users.flatMap((user) => user.roles.map((role) => role.key)))
  ).sort();

  const filteredUsers = data.users.filter((user) => {
    const statusMatches =
      selectedStatus === "ALL" || user.status === selectedStatus;

    const roleMatches =
      selectedRole === "ALL" ||
      user.roles.some((role) => role.key === selectedRole);

    const queryMatches =
      normalizedQuery.length === 0 ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      (user.profile?.displayName ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatches && roleMatches && queryMatches;
  });

  const sortedUsers = getSortedUsers(filteredUsers, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
  const visibleFrom = sortedUsers.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedUsers.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Users management"
        description="A protected users directory for administration, designed to scale later with filtering, actions, and role operations."
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
          <strong>إجمالي المستخدمين</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalUsers}</p>
        </div>
        <div className="state-card">
          <strong>المستخدمون النشطون</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeUsers}</p>
        </div>
        <div className="state-card">
          <strong>المستخدمون الموقوفون</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{suspendedUsers}</p>
        </div>
      </div>

      <form
        action="/admin/users"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        {selectedRole !== "ALL" ? (
          <input type="hidden" name="role" value={selectedRole} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث باسم المستخدم أو البريد"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedStatus, selectedRole, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", selectedRole, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(status, selectedRole, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedStatus, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedRole === "ALL" ? "primary" : "small"}`}
        >
          All Roles
        </Link>

        {roleKeys.map((roleKey) => (
          <Link
            key={roleKey}
            href={buildFilterHref(selectedStatus, roleKey, query, selectedSort, 1)}
            className={`btn ${selectedRole === roleKey ? "primary" : "small"}`}
          >
            {roleKey}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedStatus, selectedRole, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, selectedRole, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
        <Link
          href={buildFilterHref(
            selectedStatus,
            selectedRole,
            query,
            "last-activity",
            1
          )}
          className={`btn ${selectedSort === "last-activity" ? "primary" : "small"}`}
        >
          Last Activity
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> status={selectedStatus}, role={selectedRole}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedUsers.length}
        </p>
      </div>

      {paginatedUsers.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No users match the current search or selected filters."
        />
      ) : (
        <>
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
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedUsers.map((user) => (
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
                    <td>{formatDateInMakkah(user.createdAt, "en-GB")}</td>
                    <td>
                      {user.lastActivityAt
                        ? formatDateTimeInMakkah(user.lastActivityAt, "en-GB")
                        : "No activity"}
                    </td>
                    <td>
                      <Link href={`/admin/users/${user.id}`} className="btn small">
                        User Details
                      </Link>
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

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={buildFilterHref(
                selectedStatus,
                selectedRole,
                query,
                selectedSort,
                Math.max(1, safePage - 1)
              )}
              className="btn small"
              aria-disabled={safePage <= 1}
            >
              Previous
            </Link>

            <span className="btn small">
              Page {safePage} / {totalPages}
            </span>

            <Link
              href={buildFilterHref(
                selectedStatus,
                selectedRole,
                query,
                selectedSort,
                Math.min(totalPages, safePage + 1)
              )}
              className="btn small"
              aria-disabled={safePage >= totalPages}
            >
              Next
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
