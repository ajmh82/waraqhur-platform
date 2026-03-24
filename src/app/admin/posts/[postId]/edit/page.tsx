import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPostEditForm } from "@/components/admin/admin-post-edit-form";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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

interface AdminPostEditPageResult {
  post: AdminPostsData["posts"][number] | null;
  error: string | null;
}

async function loadAdminPostEditPageData(
  postId: string
): Promise<AdminPostEditPageResult> {
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
        error instanceof Error ? error.message : "Unable to load post edit page.",
    };
  }
}

export default async function AdminPostEditPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const { post, error } = await loadAdminPostEditPageData(postId);

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
        title={`Edit Post: ${post.title}`}
        description="تعديل المنشور من داخل اللوحة الموحدة."
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
        <Link href={`/admin/posts/${post.id}`} className="btn small">
          Post Details
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

      <AdminPostEditForm
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          status: post.status,
          visibility: post.visibility,
        }}
      />
    </section>
  );
}
