import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSourcePostEditForm } from "@/components/admin/admin-source-post-edit-form";
import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourceRecord {
  id: string;
  name: string;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminPostRecord {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  visibility: string;
  status: string;
  createdAt: string;
  source: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AdminSourcePostEditPageResult {
  source: AdminSourceRecord | null;
  post: AdminPostRecord | null;
  error: string | null;
}

async function loadAdminSourcePostEditPageData(
  sourceId: string,
  postId: string
): Promise<AdminSourcePostEditPageResult> {
  try {
    const [sourcesResponse, postsResponse] = await Promise.all([
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const source =
      sourcesResponse.sources.find((item) => item.id === sourceId) ?? null;

    const post =
      postsResponse.posts.find(
        (item) => item.id === postId && item.source?.id === sourceId
      ) ?? null;

    return {
      source,
      post,
      error: null,
    };
  } catch (error) {
    return {
      source: null,
      post: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات المنشور.",
    };
  }
}

export default async function AdminSourcePostEditPage({
  params,
}: {
  params: Promise<{ sourceId: string; postId: string }>;
}) {
  const { sourceId, postId } = await params;
  const { source, post, error } = await loadAdminSourcePostEditPageData(
    sourceId,
    postId
  );

  if (error) {
    return <ErrorState title="تعذر تحميل المنشور" description={error} />;
  }

  if (!source || !post) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`تعديل منشور: ${post.title}`}
        description="تعديل المنشور من داخل إدارة المصدر."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/sources/${source.id}`} className="btn small">
          العودة إلى تفاصيل المصدر
        </Link>
        <Link href={`/posts/${post.slug}`} className="btn small">
          فتح المنشور
        </Link>
      </div>

      <AdminSourcePostEditForm sourceId={source.id} post={post} />
    </section>
  );
}
