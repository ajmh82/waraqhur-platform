import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPostDeleteButton } from "@/components/admin/admin-post-delete-button";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminPostsData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    status: string;
    visibility: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    source: {
      id: string;
      name: string;
      slug: string;
    } | null;
    author: {
      id: string;
      email: string;
      username: string;
    } | null;
    updatedBy: {
      id: string;
      email: string;
      username: string;
    } | null;
    commentsCount: number;
    likesCount: number;
  }>;
}

interface AdminPostDetailsPageResult {
  post: AdminPostsData["posts"][number] | null;
  error: string | null;
}

async function loadAdminPostDetailsPageData(
  postId: string
): Promise<AdminPostDetailsPageResult> {
  try {
    const data = await dashboardApiGet<AdminPostsData>("/api/posts");
    const posts = Array.isArray(data.posts) ? data.posts : [];
    const post = posts.find((item) => item.id === postId) ?? null;

    return {
      post,
      error: null,
    };
  } catch (error) {
    return {
      post: null,
      error:
        error instanceof Error ? error.message : "Unable to load post details.",
    };
  }
}

export default async function AdminPostDetailsPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const { post, error } = await loadAdminPostDetailsPageData(postId);

  if (error) {
    return <ErrorState title="Failed to load post" description={error} />;
  }

  if (!post) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={post.title}
        description="تفاصيل المنشور من داخل لوحة الإدارة."
      />

      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/admin/posts" className="btn small">
          العودة إلى المنشورات
        </Link>

        <Link href={`/admin/posts/${post.id}/edit`} className="btn small">
          Edit Post
        </Link>

        {post.category ? (
          <Link href={`/admin/categories/${post.category.id}`} className="btn small">
            Open Category
          </Link>
        ) : null}

        {post.source ? (
          <Link href={`/admin/sources/${post.source.id}`} className="btn small">
            Open Source
          </Link>
        ) : null}

        {post.slug ? (
          <Link href={`/posts/${post.slug}`} className="btn small">
            Open Public Post
          </Link>
        ) : null}
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
          <strong>الحالة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{post.status}</p>
        </div>
        <div className="state-card">
          <strong>الظهور</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{post.visibility}</p>
        </div>
        <div className="state-card">
          <strong>التعليقات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{post.commentsCount}</p>
        </div>
        <div className="state-card">
          <strong>الإعجابات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{post.likesCount}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> postId={post.id}, status={post.status}, visibility={post.visibility}, category={post.category?.name ?? "none"}, source={post.source?.name ?? "none"}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <p><strong>Post ID:</strong> {post.id}</p>
          <p><strong>Slug:</strong> {post.slug ?? "-"}</p>
          <p><strong>Status:</strong> {post.status}</p>
          <p><strong>Visibility:</strong> {post.visibility}</p>
          <p><strong>Author:</strong> {post.author?.username ?? "-"}</p>
          <p><strong>Updated By:</strong> {post.updatedBy?.username ?? "-"}</p>
          <p>
            <strong>Source:</strong>{" "}
            {post.source ? (
              <Link href={`/admin/sources/${post.source.id}`} className="btn small">
                {post.source.name}
              </Link>
            ) : (
              "-"
            )}
          </p>
          <p>
            <strong>Category:</strong>{" "}
            {post.category ? (
              <Link href={`/admin/categories/${post.category.id}`} className="btn small">
                {post.category.name}
              </Link>
            ) : (
              "-"
            )}
          </p>
          <p><strong>Comments Count:</strong> {post.commentsCount}</p>
          <p><strong>Likes Count:</strong> {post.likesCount}</p>
          <p><strong>Published At:</strong> {post.publishedAt ? formatDateTimeInMakkah(post.publishedAt, "ar-BH") : "-"}</p>
          <p><strong>Created At:</strong> {formatDateTimeInMakkah(post.createdAt, "ar-BH")}</p>
          <p><strong>Updated At:</strong> {formatDateTimeInMakkah(post.updatedAt, "ar-BH")}</p>
        </div>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>Excerpt</h2>
        <p style={{ marginBottom: 0 }}>{post.excerpt ?? "-"}</p>
      </div>

      {post.coverImageUrl ? (
        <div className="state-card" style={{ marginBottom: "18px" }}>
          <h2 style={{ marginTop: 0 }}>Cover Image</h2>
          <p style={{ marginBottom: "10px" }}>{post.coverImageUrl}</p>
        </div>
      ) : null}

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <h2 style={{ marginTop: 0 }}>Content</h2>
        <div style={{ whiteSpace: "pre-wrap" }}>{post.content}</div>
      </div>

      <div className="state-card">
        <h2 style={{ marginTop: 0 }}>Danger Zone</h2>
        <AdminPostDeleteButton postId={post.id} />
      </div>
    </section>
  );
}
