import Link from "next/link";
import { AdminCommentActions } from "@/components/admin/admin-comment-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminCommentsData {
  comments?: Array<{
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
    replies?: Array<{
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

interface ReplyRecord {
  id: string;
  postId: string;
  parentId: string;
  parentContent: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    username: string;
  } | null;
}

interface AdminCommentRepliesPageResult {
  replies: ReplyRecord[] | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminCommentRepliesPageData(): Promise<AdminCommentRepliesPageResult> {
  try {
    const data = await dashboardApiGet<AdminCommentsData>("/api/comments");
    const comments = Array.isArray(data.comments) ? data.comments : [];

    const replies = comments.flatMap((comment) => {
      const nestedReplies = Array.isArray(comment.replies) ? comment.replies : [];

      return nestedReplies.map((reply) => ({
        id: reply.id,
        postId: reply.postId,
        parentId: comment.id,
        parentContent: comment.content,
        content: reply.content,
        status: reply.status,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        author: reply.author,
      }));
    });

    return { replies, error: null };
  } catch (error) {
    return {
      replies: null,
      error:
        error instanceof Error ? error.message : "Unable to load comment replies.",
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
  return queryString ? `/admin/comment-replies?${queryString}` : "/admin/comment-replies";
}

function getSortedReplies(replies: ReplyRecord[], sort: SortKey) {
  const nextReplies = [...replies];

  nextReplies.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextReplies;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "Oldest First" : "Newest First";
}

export default async function AdminCommentRepliesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { replies, error } = await loadAdminCommentRepliesPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !replies) {
    return (
      <ErrorState
        title="Failed to load comment replies"
        description={error ?? "Unable to load comment replies."}
      />
    );
  }

  const totalReplies = replies.length;
  const activeReplies = replies.filter((reply) => reply.status === "ACTIVE").length;
  const hiddenReplies = replies.filter((reply) => reply.status === "HIDDEN").length;
  const statuses = Array.from(new Set(replies.map((reply) => reply.status))).sort();

  const filteredReplies = replies.filter((reply) => {
    const statusMatches =
      selectedStatus === "ALL" || reply.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      reply.content.toLowerCase().includes(normalizedQuery) ||
      reply.parentContent.toLowerCase().includes(normalizedQuery) ||
      (reply.author?.username ?? "").toLowerCase().includes(normalizedQuery) ||
      reply.postId.toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

  const sortedReplies = getSortedReplies(filteredReplies, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedReplies.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedReplies = sortedReplies.slice(startIndex, endIndex);
  const visibleFrom = sortedReplies.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedReplies.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Comment Replies Management"
        description="لوحة موحدة لإدارة الردود على التعليقات."
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
          <strong>إجمالي الردود</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalReplies}</p>
        </div>
        <div className="state-card">
          <strong>الردود النشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{activeReplies}</p>
        </div>
        <div className="state-card">
          <strong>الردود المخفية</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{hiddenReplies}</p>
        </div>
      </div>

      <form
        action="/admin/comment-replies"
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
          placeholder="ابحث داخل الرد أو التعليق الأصلي أو الكاتب أو postId"
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
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedReplies.length}
        </p>
      </div>

      {paginatedReplies.length === 0 ? (
        <EmptyState
          title="لا توجد ردود"
          description="لا توجد ردود تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reply</th>
                  <th>Parent Comment</th>
                  <th>Author</th>
                  <th>Post ID</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReplies.map((reply) => (
                  <tr key={reply.id}>
                    <td style={{ maxWidth: "320px" }}>{reply.content}</td>
                    <td style={{ maxWidth: "320px" }}>{reply.parentContent}</td>
                    <td>{reply.author?.username ?? "-"}</td>
                    <td>{reply.postId}</td>
                    <td>{reply.status}</td>
                    <td>{formatDateTimeInMakkah(reply.createdAt, "ar-BH")}</td>
                    <td>
                      <AdminCommentActions
                        comment={{
                          id: reply.id,
                          status: reply.status,
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
