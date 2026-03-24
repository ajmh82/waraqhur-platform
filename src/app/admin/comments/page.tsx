import Link from "next/link";
import { AdminCommentActions } from "@/components/admin/admin-comment-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminCommentsData {
  comments: Array<{
    id: string;
    postId: string;
    parentId: string | null;
    content: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    author: {
      id: string;
      email: string;
      username: string;
    } | null;
    repliesCount: number;
    replies: Array<{
      id: string;
      postId: string;
      parentId: string | null;
      content: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      author: {
        id: string;
        email: string;
        username: string;
      } | null;
      repliesCount: number;
    }>;
  }>;
}

interface AdminCommentsPageResult {
  data: AdminCommentsData | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminCommentsPageData(): Promise<AdminCommentsPageResult> {
  try {
    const data = await dashboardApiGet<AdminCommentsData>("/api/comments");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load comments.",
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
  return queryString ? `/admin/comments?${queryString}` : "/admin/comments";
}

function getSortedComments(
  comments: AdminCommentsData["comments"],
  sort: SortKey
) {
  const nextComments = [...comments];

  nextComments.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextComments;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "Oldest First" : "Newest First";
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminCommentsPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load comments"
        description={error ?? "Unable to load comments."}
      />
    );
  }

  const totalComments = data.comments.length;
  const activeComments = data.comments.filter(
    (comment) => comment.status === "ACTIVE"
  ).length;
  const hiddenComments = data.comments.filter(
    (comment) => comment.status === "HIDDEN"
  ).length;
  const statuses = Array.from(
    new Set(data.comments.map((comment) => comment.status))
  ).sort();

  const filteredComments = data.comments.filter((comment) => {
    const statusMatches =
      selectedStatus === "ALL" || comment.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      comment.content.toLowerCase().includes(normalizedQuery) ||
      (comment.author?.username ?? "").toLowerCase().includes(normalizedQuery) ||
      comment.postId.toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

  const sortedComments = getSortedComments(filteredComments, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedComments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedComments = sortedComments.slice(startIndex, endIndex);
  const visibleFrom = sortedComments.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedComments.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Comments management"
        description="إدارة ومراجعة التعليقات من داخل لوحة الإدارة."
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
          <strong>إجمالي التعليقات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalComments}</p>
        </div>
        <div className="state-card">
          <strong>التعليقات النشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeComments}</p>
        </div>
        <div className="state-card">
          <strong>التعليقات المخفية</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{hiddenComments}</p>
        </div>
      </div>

      <form
        action="/admin/comments"
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

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث داخل التعليق أو الكاتب أو postId"
          className="search-input"
          style={{ minWidth: "320px" }}
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

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
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

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
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
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> status={selectedStatus}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedComments.length}
        </p>
      </div>

      {paginatedComments.length === 0 ? (
        <EmptyState
          title="لا توجد تعليقات"
          description="لا توجد تعليقات تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>Author</th>
                  <th>Post ID</th>
                  <th>Replies</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedComments.map((comment) => (
                  <tr key={comment.id}>
                    <td style={{ maxWidth: "420px" }}>{comment.content}</td>
                    <td>{comment.author?.username ?? "-"}</td>
                    <td>{comment.postId}</td>
                    <td>{comment.repliesCount}</td>
                    <td>{comment.status}</td>
                    <td>{formatDateTimeInMakkah(comment.createdAt, "ar-BH")}</td>
                    <td>
                      <Link href={`/admin/comments/${comment.id}`} className="btn small">
                        Comment Details
                      </Link>
                    </td>
                    <td>
                      <AdminCommentActions
                        comment={{
                          id: comment.id,
                          status: comment.status,
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
