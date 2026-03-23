import Link from "next/link";
import { AdminCommentActions } from "@/components/admin/admin-comment-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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

function buildFilterHref(status: string, query: string) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();
  return queryString ? `/admin/comments?${queryString}` : "/admin/comments";
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { data, error } = await loadAdminCommentsPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
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
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
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

        <Link href={buildFilterHref(selectedStatus, "")} className="btn small">
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", query)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(status, query)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredComments.length === 0 ? (
        <EmptyState
          title="لا توجد تعليقات"
          description="لا توجد تعليقات تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComments.map((comment) => (
                <tr key={comment.id}>
                  <td style={{ maxWidth: "420px" }}>{comment.content}</td>
                  <td>{comment.author?.username ?? "-"}</td>
                  <td>{comment.postId}</td>
                  <td>{comment.repliesCount}</td>
                  <td>{comment.status}</td>
                  <td>{new Date(comment.createdAt).toLocaleString("ar-BH")}</td>
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
      )}
    </section>
  );
}
