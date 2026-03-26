import Link from "next/link";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateInMakkah, formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminUsersResponse {
  data: {
    users: Array<{
      id: string;
      email: string;
      username: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      profile: { displayName: string } | null;
      roles: Array<{ key: string; name: string; assignedAt: string }>;
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
        error instanceof Error ? error.message : "تعذر تحميل قائمة المستخدمين.",
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

  if (status !== "ALL") params.set("status", status);
  if (role !== "ALL") params.set("role", role);
  if (query.trim()) params.set("q", query.trim());
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

function getSortedUsers(
  users: AdminUsersResponse["data"]["users"],
  sort: SortKey
) {
  const next = [...users];

  if (sort === "oldest") {
    next.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return next;
  }

  if (sort === "last-activity") {
    next.sort((a, b) => {
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime;
    });
    return next;
  }

  next.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return next;
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
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedRole = sp.role?.trim() ?? "ALL";
  const selectedSort =
    sp.sort?.trim() === "oldest" || sp.sort?.trim() === "last-activity"
      ? (sp.sort.trim() as SortKey)
      : "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل المستخدمين"
        description={error ?? "تعذر تحميل قائمة المستخدمين."}
      />
    );
  }

  const totalUsers = data.users.length;
  const activeUsers = data.users.filter((user) => user.status === "ACTIVE").length;
  const suspendedUsers = data.users.filter(
    (user) => user.status === "SUSPENDED"
  ).length;
  const statuses = Array.from(new Set(data.users.map((user) => user.status))).sort();
  const roleKeys = Array.from(
    new Set(data.users.flatMap((user) => user.roles.map((role) => role.key)))
  ).sort();

  const filtered = data.users.filter((user) => {
    const statusMatch =
      selectedStatus === "ALL" || user.status === selectedStatus;
    const roleMatch =
      selectedRole === "ALL" ||
      user.roles.some((role) => role.key === selectedRole);
    const queryMatch =
      normalizedQuery.length === 0 ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      (user.profile?.displayName ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatch && roleMatch && queryMatch;
  });

  const sorted = getSortedUsers(filtered, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const visibleFrom = sorted.length === 0 ? 0 : start + 1;
  const visibleTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الإدارة"
        title="إدارة المستخدمين"
        description="مراجعة الحسابات، الحالة، الأدوار، وآخر نشاط من واجهة أوضح وأكثر اتساقًا."
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
          <strong>النشطون</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeUsers}</p>
        </div>
        <div className="state-card">
          <strong>الموقوفون</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {suspendedUsers}
          </p>
        </div>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          padding: "16px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص سريع</strong>
        <p style={{ margin: 0 }}>
          استخدم الفلاتر التالية للوصول السريع إلى فئة محددة من المستخدمين حسب
          الحالة أو الدور أو آخر نشاط.
        </p>
      </div>

      <form
        action="/admin/users"
        method="GET"
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
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
          placeholder="ابحث باسم المستخدم أو البريد أو الاسم المعروض"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          بحث
        </button>

        <Link
          href={buildFilterHref(selectedStatus, selectedRole, "", selectedSort, 1)}
          className="btn small"
        >
          مسح البحث
        </Link>
      </form>

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref("ALL", selectedRole, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          جميع الحالات
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

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedStatus, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedRole === "ALL" ? "primary" : "small"}`}
        >
          جميع الأدوار
        </Link>

        {roleKeys.map((role) => (
          <Link
            key={role}
            href={buildFilterHref(selectedStatus, role, query, selectedSort, 1)}
            className={`btn ${selectedRole === role ? "primary" : "small"}`}
          >
            {role}
          </Link>
        ))}
      </div>

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedStatus, selectedRole, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, selectedRole, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
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
          آخر نشاط
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          عرض {visibleFrom}-{visibleTo} من أصل {sorted.length}
        </p>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          title="لا يوجد مستخدمون"
          description="لا يوجد مستخدمون يطابقون البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>التسجيل</th>
                  <th>آخر نشاط</th>
                  <th>التفاصيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-table__primary">
                        {user.profile?.displayName ?? user.username}
                      </div>
                      <div className="admin-table__secondary">{user.username}</div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.roles[0]?.name ?? "بدون دور"}</td>
                    <td>{user.status}</td>
                    <td>{formatDateInMakkah(user.createdAt, "ar-BH")}</td>
                    <td>
                      {user.lastActivityAt
                        ? formatDateTimeInMakkah(user.lastActivityAt, "ar-BH")
                        : "لا يوجد نشاط"}
                    </td>
                    <td>
                      <Link href={`/admin/users/${user.id}`} className="btn small">
                        تفاصيل
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
              السابق
            </Link>
            <span className="btn small">
              صفحة {safePage} / {totalPages}
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
              التالي
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
