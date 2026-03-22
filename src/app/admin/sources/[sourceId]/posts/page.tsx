import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPostDeleteButton } from "@/components/admin/admin-post-delete-button";
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

function buildFilterHref(
  sourceId: string,
  status: string,
  query: string
) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/sources/${sourceId}/posts?${queryString}`
    : `/admin/sources/${sourceId}/posts`;
}

export default async function AdminSourcePostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { sourceId } = await params;
  const { source, posts, error } = await loadAdminSourcePostsPageData(sourceId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل منشورات المصدر" description={error} />;
  }

  if (!source) {
    notFound();
  }

  const statuses = Array.from(new Set(posts.map((post) => post.status)));

  const filteredPosts = posts.filter((post) => {
    const statusMatches =
      selectedStatus === "ALL" || post.status === selectedStatus;

    const queryMatches =
      normalizedQuery.length === 0 ||
      post.title.toLowerCase().includes(normalizedQuery) ||
      (post.slug ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

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

      <form
        action={`/admin/sources/${source.id}/posts`}
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
          placeholder="ابحث بالعنوان أو slug"
          className="search-input"
          style={{ minWidth: "280px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(source.id, selectedStatus, "")}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(source.id, "ALL", query)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(source.id, status, query)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <EmptyState
          title="لا توجد منشورات مطابقة"
          description="لا توجد منشورات تطابق البحث الحالي أو الفلاتر الحالية."
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
                <th>Delete</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
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
                    <AdminPostDeleteButton postId={post.id} />
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
