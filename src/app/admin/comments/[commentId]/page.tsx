import Link from "next/link";
import { notFound } from "next/navigation";
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

interface AdminCommentDetailsPageResult {
  comment: AdminCommentsData["comments"][number] | null;
  error: string | null;
}

async function loadAdminCommentDetailsPageData(
  commentId: string
): Promise<AdminCommentDetailsPageResult> {
  try {
    const data = await dashboardApiGet<AdminCommentsData>("/api/comments");
    const comment = data.comments.find((item) => item.id === commentId) ?? null;

    return {
      comment,
      error: null,
    };
  } catch (error) {
    return {
      comment: null,
      error:
        error instanceof Error ? error.message : "Unable to load comment details.",
    };
  }
}

export default async function AdminCommentDetailsPage({
  params,
}: {
  params: Promise<{ commentId: string }>;
}) {
  const { commentId } = await params;
  const { comment, error } = await loadAdminCommentDetailsPageData(commentId);

  if (error) {
    return <ErrorState title="Failed to load comment" description={error} />;
  }

  if (!comment) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Comment Details"
        description="عرض تفاصيل التعليق والردود التابعة له."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/comments" className="btn small">
          العودة إلى التعليقات
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>Comment ID:</strong> {comment.id}</p>
          <p><strong>Post ID:</strong> {comment.postId}</p>
          <p><strong>Parent ID:</strong> {comment.parentId ?? "-"}</p>
          <p><strong>Author:</strong> {comment.author?.username ?? "-"}</p>
          <p><strong>Status:</strong> {comment.status}</p>
          <p><strong>Replies:</strong> {comment.repliesCount}</p>
          <p><strong>Created At:</strong> {new Date(comment.createdAt).toLocaleString("ar-BH")}</p>
          <p><strong>Updated At:</strong> {new Date(comment.updatedAt).toLocaleString("ar-BH")}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>Content</h2>
        <p style={{ marginBottom: 0 }}>{comment.content}</p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>Actions</h2>
        <AdminCommentActions
          comment={{
            id: comment.id,
            status: comment.status,
          }}
        />
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>Replies</h2>

        {comment.replies.length === 0 ? (
          <EmptyState
            title="لا توجد ردود"
            description="لا توجد ردود تابعة لهذا التعليق."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reply</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {comment.replies.map((reply) => (
                  <tr key={reply.id}>
                    <td>{reply.content}</td>
                    <td>{reply.author?.username ?? "-"}</td>
                    <td>{reply.status}</td>
                    <td>{new Date(reply.createdAt).toLocaleString("ar-BH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
