import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminSourceRecord {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AdminPostRecord {
  id: string;
  title: string;
  slug: string | null;
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

interface AdminSourcePostsPageResult {
  source: AdminSourceRecord | null;
  posts: AdminPostRecord[];
  error: string | null;
}

async function loadAdminSourcePostsPageData(
  sourceId: string
): Promise<AdminSourcePostsPageResult> {
  try {
    const [sourcesData, postsData] = await Promise.all([
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const source = sourcesData.sources.find((item) => item.id === sourceId) ?? null;

    if (!source) {
      return {
        source: null,
        posts: [],
        error: null,
      };
    }

    const posts = postsData.posts.filter((post) => post.source?.id === source.id);

    return {
      source,
      posts,
      error: null,
    };
  } catch (error) {
    return {
      source: null,
      posts: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل منشورات المصدر.",
    };
  }
}

export default async function AdminSourcePostsPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { source, posts, error } = await loadAdminSourcePostsPageData(sourceId);

  if (error) {
    return <ErrorState title="تعذر تحميل منشورات المصدر" description={error} />;
  }

  if (!source) {
    notFound();
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`منشورات المصدر: ${source.name}`}
        description="عرض جميع المنشورات المرتبطة بهذا المصدر من داخل لوحة الإدارة."
      />

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/sources/${source.id}`} className="btn small">
          العودة إلى تفاصيل المصدر
        </Link>
        <Link href={`/admin/sources/${source.id}/posts/new`} className="btn small">
          Create Post Manually
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="لا توجد منشورات"
          description="لا توجد منشورات مرتبطة بهذا المصدر حتى الآن."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>الحالة</th>
                <th>الظهور</th>
                <th>التاريخ</th>
                <th>Edit</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className="admin-table__primary">{post.title}</div>
                    <div className="admin-table__secondary">{post.slug ?? "-"}</div>
                  </td>
                  <td>{post.status}</td>
                  <td>{post.visibility}</td>
                  <td>{new Date(post.createdAt).toLocaleString("ar-BH")}</td>
                  <td>
                    <Link
                      href={`/admin/sources/${source.id}/posts/${post.id}/edit`}
                      className="btn small"
                    >
                      Edit Post
                    </Link>
                  </td>
                  <td>
                    <Link href={post.slug ? `/posts/${post.slug}` : "#"} className="btn small">
                      Open
                    </Link>
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
