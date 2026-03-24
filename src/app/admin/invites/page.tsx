import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminInvitationsResponse {
  invitations: Array<{
    id: string;
    email: string;
    token: string;
    status: string;
    sentAt: string | null;
    acceptedAt: string | null;
    revokedAt: string | null;
    expiresAt: string;
    createdAt: string;
    role: {
      key: string;
      name: string;
    } | null;
    issuerUser: {
      id: string;
      email: string;
      username: string;
    };
    usages: Array<{
      id: string;
      usedAt: string;
      user: {
        id: string;
        email: string;
        username: string;
      };
    }>;
  }>;
}

interface AdminInvitesPageResult {
  data: AdminInvitationsResponse | null;
  error: string | null;
}

type SortKey = "newest" | "oldest" | "expires-soon";

const PAGE_SIZE = 10;

async function loadAdminInvitesPageData(): Promise<AdminInvitesPageResult> {
  try {
    const data =
      await dashboardApiGet<AdminInvitationsResponse>("/api/invitations");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load admin invitations list.",
    };
  }
}

function buildFilterHref(
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
  return queryString ? `/admin/invites?${queryString}` : "/admin/invites";
}

function getSortedInvitations(
  invitations: AdminInvitationsResponse["invitations"],
  sort: SortKey
) {
  const nextInvitations = [...invitations];

  if (sort === "oldest") {
    nextInvitations.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return nextInvitations;
  }

  if (sort === "expires-soon") {
    nextInvitations.sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );
    return nextInvitations;
  }

  nextInvitations.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return nextInvitations;
}

function getSortLabel(sort: SortKey) {
  if (sort === "oldest") {
    return "Oldest First";
  }

  if (sort === "expires-soon") {
    return "Expires Soon";
  }

  return "Newest First";
}

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminInvitesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ||
    currentSearchParams.sort?.trim() === "expires-soon"
      ? (currentSearchParams.sort.trim() as SortKey)
      : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load invites"
        description={error ?? "Unable to load admin invitations list."}
      />
    );
  }

  const invitations = Array.isArray(data.invitations) ? data.invitations : [];
  const totalInvites = invitations.length;
  const acceptedInvites = invitations.filter(
    (invitation) => invitation.status === "ACCEPTED"
  ).length;
  const pendingInvites = invitations.filter(
    (invitation) => invitation.status === "PENDING"
  ).length;
  const revokedInvites = invitations.filter(
    (invitation) => invitation.status === "REVOKED"
  ).length;
  const statuses = Array.from(
    new Set(invitations.map((invitation) => invitation.status))
  ).sort();

  const filteredInvitations = invitations.filter((invitation) => {
    const statusMatches =
      selectedStatus === "ALL" || invitation.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      invitation.email.toLowerCase().includes(normalizedQuery) ||
      invitation.token.toLowerCase().includes(normalizedQuery) ||
      invitation.issuerUser.username.toLowerCase().includes(normalizedQuery) ||
      (invitation.role?.name ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

  const sortedInvitations = getSortedInvitations(filteredInvitations, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedInvitations.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedInvitations = sortedInvitations.slice(startIndex, endIndex);
  const visibleFrom = sortedInvitations.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedInvitations.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Invitations management"
        description="لوحة موحدة لإدارة الدعوات مع البحث والفلاتر والترتيب."
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
          <strong>إجمالي الدعوات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalInvites}</p>
        </div>
        <div className="state-card">
          <strong>Pending</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{pendingInvites}</p>
        </div>
        <div className="state-card">
          <strong>Accepted</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{acceptedInvites}</p>
        </div>
        <div className="state-card">
          <strong>Revoked</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{revokedInvites}</p>
        </div>
      </div>

      <form
        action="/admin/invites"
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
          placeholder="ابحث بالبريد أو token أو issuer أو role"
          className="search-input"
          style={{ minWidth: "360px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedStatus, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(status, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, query, "expires-soon", 1)}
          className={`btn ${selectedSort === "expires-soon" ? "primary" : "small"}`}
        >
          Expires Soon
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> status={selectedStatus}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedInvitations.length}
        </p>
      </div>

      {paginatedInvitations.length === 0 ? (
        <EmptyState
          title="No invitations found"
          description="No invitations match the current search or filters."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Issued by</th>
                  <th>Sent at</th>
                  <th>Expires at</th>
                  <th>Accepted at</th>
                </tr>
              </thead>

              <tbody>
                {paginatedInvitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{invitation.status}</td>
                    <td>{invitation.role?.name ?? "No role"}</td>
                    <td>{invitation.issuerUser.username}</td>
                    <td>
                      {invitation.sentAt
                        ? formatDateTimeInMakkah(invitation.sentAt, "en-GB")
                        : "Not sent"}
                    </td>
                    <td>{formatDateTimeInMakkah(invitation.expiresAt, "en-GB")}</td>
                    <td>
                      {invitation.acceptedAt
                        ? formatDateTimeInMakkah(invitation.acceptedAt, "en-GB")
                        : "-"}
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
