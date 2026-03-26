import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

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

interface AdminRoleUsersPageResult {
  role: AdminRolesResponse["data"]["roles"][number] | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminRoleUsersPageData(
  roleId: string
): Promise<AdminRoleUsersPageResult> {
  try {
    const response = await dashboardApiGet<AdminRolesResponse>("/api/admin/roles");
    const roles = Array.isArray(response.data.roles) ? response.data.roles : [];
    const role = roles.find((item) => item.id === roleId) ?? null;

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

function buildFilterHref(
  roleId: string,
  status: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
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
  return queryString
    ? `/admin/roles/${roleId}/users?${queryString}`
    : `/admin/roles/${roleId}/users`;
}

function getSortedUsers(
  users: AdminRolesResponse["data"]["roles"][number]["users"],
  sort: SortKey
) {
  const nextUsers = [...users];

  nextUsers.sort((a, b) => {
    const aTime = new Date(a.assignedAt).getTime();
    const bTime = new Date(b.assignedAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextUsers;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "الأقدم أولاً" : "الأحدث أولاً";
}

export default async function AdminRoleUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { roleId } = await params;
  const { role, error } = await loadAdminRoleUsersPageData(roleId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل مستخدمي الدور" description={error} />;
  }

  if (!role) {
    notFound();
  }

  const users = Array.isArray(role.users) ? role.users : [];
  const statuses = Array.from(new Set(users.map((user) => user.status))).sort();

  const filteredUsers = users.filter((user) => {
    const statusMatches =
      selectedStatus === "ALL" || user.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
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
        title={`مستخدمو الدور: ${role.name}`}
        description="عرض جميع المستخدمين المرتبطين بهذا الدور."
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
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{users.length}</p>
        </div>
        <div className="state-card">
          <strong>المستخدمون الظاهرون</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{sortedUsers.length}</p>
        </div>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/roles/${role.id}`} className="btn small">
          العودة إلى تفاصيل الدور
        </Link>
        <Link href="/admin/users" className="btn small">
          إدارة المستخدمين
        </Link>
      </div>

      <form
        action={`/admin/roles/${role.id}/users`}
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="اSearch باسم المستخدم أو البريد"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(role.id, selectedStatus, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(role.id, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          جميع الحالات
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(role.id, status, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(role.id, selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildFilterHref(role.id, selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
        </Link>
      </div>

      

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>عرض:</strong> {visibleFrom}-{visibleTo} of {sortedUsers.length}
        </p>
      </div>

      {paginatedUsers.length === 0 ? (
        <EmptyState
          title="لا يوجد مستخدمون"
          description="لا يوجد مستخدمون مرتبطون بهذا الدور حسب الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>اسم المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الحالة</th>
                  <th>تاريخ الإسناد</th>
                  <th>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.status}</td>
                    <td>{formatDateTimeInMakkah(user.assignedAt, "ar-BH")}</td>
                    <td>
                      <Link href={`/admin/users/${user.id}`} className="btn small">
                        تفاصيل المستخدم
                      </Link>
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
                role.id,
                selectedStatus,
                query,
                selectedSort,
                Math.max(1, safePage - 1)
              )}
              className="btn small"
              aria-disabled={safePage <= 1}
            >
              السابق
            </Link>

            <span className="btn small">
              Page {safePage} / {totalPages}
            </span>

            <Link
              href={buildFilterHref(
                role.id,
                selectedStatus,
                query,
                selectedSort,
                Math.min(totalPages, safePage + 1)
              )}
              className="btn small"
              aria-disabled={safePage >= totalPages}
            >
              التالي
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
