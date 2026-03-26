import Link from "next/link";
import { notFound } from "next/navigation";
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

interface AdminCommentDetailsPageResult {
  comment: AdminCommentsData["comments"][number] | null;
  error: string | null;
}

async function loadAdminCommentDetailsPageData(
  commentId: string
): Promise<AdminCommentDetailsPageResult> {
  try {
    const data = await dashboardApiGet<AdminCommentsData>("/api/comments");
    const comments = Array.isArray(data.comments) ? data.comments : [];
    const comment = comments.find((item) => item.id === commentId) ?? null;

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
    return <ErrorState title="تعذر تحميل التعليق" description={error} />;
  }

  if (!comment) {
    notFound();
  }

  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  const activeReplies = replies.filter((reply) => reply.status === "ACTIVE").length;
  const hiddenReplies = replies.filter((reply) => reply.status === "HIDDEN").length;

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
        <Link href="/admin/comment-replies" className="btn small">
          ردود التعليقات
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>حالة التعليق</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{comment.status}</p>
        </div>
        <div className="state-card">
          <strong>إجمالي الردود</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{replies.length}</p>
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

      

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>معرّف التعليق:</strong> {comment.id}</p>
          <p><strong>معرّف المنشور:</strong> {comment.postId}</p>
          <p><strong>معرّف الأصل:</strong> {comment.parentId ?? "-"}</p>
          <p><strong>الكاتب:</strong> {comment.author?.username ?? "-"}</p>
          <p><strong>الحالة:</strong> {comment.status}</p>
          <p><strong>الردود:</strong> {comment.repliesCount}</p>
          <p><strong>تاريخ الإنشاء:</strong> {formatDateTimeInMakkah(comment.createdAt, "ar-BH")}</p>
          <p><strong>آخر تحديث:</strong> {formatDateTimeInMakkah(comment.updatedAt, "ar-BH")}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>المحتوى</h2>
        <p style={{ marginBottom: 0 }}>{comment.content}</p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>الإجراءات</h2>
        <AdminCommentActions
          comment={{
            id: comment.id,
            status: comment.status,
          }}
        />
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>الردود</h2>

        {replies.length === 0 ? (
          <EmptyState
            title="لا توجد ردود"
            description="لا توجد ردود تابعة لهذا التعليق."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>معرّف الرد</th>
                  <th>الرد</th>
                  <th>الكاتب</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {replies.map((reply) => (
                  <tr key={reply.id}>
                    <td>{reply.id}</td>
                    <td>{reply.content}</td>
                    <td>{reply.author?.username ?? "-"}</td>
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
        )}
      </div>
    </section>
  );
}
