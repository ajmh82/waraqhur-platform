import Link from "next/link";
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
      permissions: string[];
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

interface AdminRolesPageResult {
  data: AdminRolesResponse["data"] | null;
  error: string | null;
}

type SortKey = "newest" | "oldest" | "most-users";

const PAGE_SIZE = 10;

async function loadAdminRolesPageData(): Promise<AdminRolesPageResult> {
  try {
    const response = await dashboardApiGet<AdminRolesResponse>("/api/admin/roles");
    return { data: response.data, error: null };
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

function buildFilterHref(
  type: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (type !== "ALL") {
    params.set("type", type);
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
  return queryString ? `/admin/roles?${queryString}` : "/admin/roles";
}

function getSortedRoles(
  roles: AdminRolesResponse["data"]["roles"],
  sort: SortKey
) {
  const nextRoles = [...roles];

  if (sort === "oldest") {
    nextRoles.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return nextRoles;
  }

  if (sort === "most-users") {
    nextRoles.sort((a, b) => b.usersCount - a.usersCount);
    return nextRoles;
  }

  nextRoles.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return nextRoles;
}

function getSortLabel(sort: SortKey) {
  if (sort === "oldest") {
    return "Oldest First";
  }

  if (sort === "most-users") {
    return "Most Users";
  }

  return "Newest First";
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminRolesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedType = currentSearchParams.type?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ||
    currentSearchParams.sort?.trim() === "most-users"
      ? (currentSearchParams.sort.trim() as SortKey)
      : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load roles"
        description={error ?? "Unable to load admin roles and permissions."}
      />
    );
  }

  const roles = Array.isArray(data.roles) ? data.roles : [];
  const totalRoles = roles.length;
  const systemRoles = roles.filter((role) => role.isSystem).length;
  const customRoles = roles.filter((role) => !role.isSystem).length;
  const totalAssignments = roles.reduce((sum, role) => sum + role.usersCount, 0);

  const filteredRoles = roles.filter((role) => {
    const typeMatches =
      selectedType === "ALL" ||
      (selectedType === "SYSTEM" && role.isSystem) ||
      (selectedType === "CUSTOM" && !role.isSystem);

    const queryMatches =
      normalizedQuery.length === 0 ||
      role.name.toLowerCase().includes(normalizedQuery) ||
      role.key.toLowerCase().includes(normalizedQuery) ||
      (role.description ?? "").toLowerCase().includes(normalizedQuery) ||
      role.permissions.some((permission) =>
        permission.toLowerCase().includes(normalizedQuery)
      );

    return typeMatches && queryMatches;
  });

  const sortedRoles = getSortedRoles(filteredRoles, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedRoles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedRoles = sortedRoles.slice(startIndex, endIndex);
  const visibleFrom = sortedRoles.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedRoles.length);

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
          <strong>أدوار مخصصة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{customRoles}</p>
        </div>
        <div className="state-card">
          <strong>إجمالي الإسنادات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalAssignments}</p>
        </div>
      </div>

      <form
        action="/admin/roles"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedType !== "ALL" ? (
          <input type="hidden" name="type" value={selectedType} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث باسم الدور أو key أو permission"
          className="search-input"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedType, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", query, selectedSort, 1)}
          className={`btn ${selectedType === "ALL" ? "primary" : "small"}`}
        >
          All Types
        </Link>
        <Link
          href={buildFilterHref("SYSTEM", query, selectedSort, 1)}
          className={`btn ${selectedType === "SYSTEM" ? "primary" : "small"}`}
        >
          System Only
        </Link>
        <Link
          href={buildFilterHref("CUSTOM", query, selectedSort, 1)}
          className={`btn ${selectedType === "CUSTOM" ? "primary" : "small"}`}
        >
          Custom Only
        </Link>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedType, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedType, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
        <Link
          href={buildFilterHref(selectedType, query, "most-users", 1)}
          className={`btn ${selectedSort === "most-users" ? "primary" : "small"}`}
        >
          Most Users
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> type={selectedType}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedRoles.length}
        </p>
      </div>

      {paginatedRoles.length === 0 ? (
        <EmptyState
          title="لا توجد أدوار"
          description="لا توجد أدوار تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div style={{ display: "grid", gap: "14px" }}>
            {paginatedRoles.map((role) => (
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
                  <p style={{ margin: 0 }}>
                    <strong>تاريخ الإنشاء:</strong> {formatDateTimeInMakkah(role.createdAt, "ar-BH")}
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
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Link href={`/admin/roles/${role.id}`} className="btn small">
                      Role Details
                    </Link>
                    <Link href={`/admin/roles/${role.id}/users`} className="btn small">
                      Role Users
                    </Link>
                  </div>
                </div>
              </article>
            ))}
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
                selectedType,
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
                selectedType,
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
