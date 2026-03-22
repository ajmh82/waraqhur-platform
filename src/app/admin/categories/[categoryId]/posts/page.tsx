import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminPostRecord {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  visibility: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AdminCategoryPostsPageResult {
  category: AdminCategoryRecord | null;
  posts: AdminPostRecord[];
  error: string | null;
}

async function loadAdminCategoryPostsPageData(
  categoryId: string
): Promise<AdminCategoryPostsPageResult> {
  try {
    const [categoriesData, postsData] = await Promise.all([
      dashboardApiGet<{ categories: AdminCategoryRecord[] }>("/api/categories"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const category =
      categoriesData.categories.find((item) => item.id === categoryId) ?? null;

    if (!category) {
      return {
        category: null,
        posts: [],
        error: null,
      };
    }

    const posts = postsData.posts.filter(
      (post) => post.category?.id === category.id
    );

    return {
      category,
      posts,
      error: null,
    };
  } catch (error) {
    return {
      category: null,
      posts: [],
      error:
        error instanceof Error ? error.message : "تعذر تحميل منشورات التصنيف.",
    };
  }
}

function buildFilterHref(categoryId: string, status: string, query: string) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const queryString = params.toString();
  return queryString
    ? `/admin/categories/${categoryId}/posts?${queryString}`
    : `/admin/categories/${categoryId}/posts`;
}

export default async function AdminCategoryPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { categoryId } = await params;
  const { category, posts, error } =
    await loadAdminCategoryPostsPageData(categoryId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل منشورات التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  const statuses = Array.from(new Set(posts.map((post) => post.status)));
  const totalPosts = posts.length;
  const draftPosts = posts.filter((post) => post.status === "DRAFT").length;
  const publishedPosts = posts.filter((post) => post.status === "PUBLISHED").length;
  const archivedPosts = posts.filter((post) => post.status === "ARCHIVED").length;

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
        title={`منشورات التصنيف: ${category.name}`}
        description="عرض جميع المنشورات المرتبطة بهذا التصنيف."
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
          <strong>إجمالي المنشورات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalPosts}</p>
        </div>
        <div className="state-card">
          <strong>Draft</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{draftPosts}</p>
        </div>
        <div className="state-card">
          <strong>Published</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{publishedPosts}</p>
        </div>
        <div className="state-card">
          <strong>Archived</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{archivedPosts}</p>
        </div>
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link href={`/admin/categories/${category.id}`} className="btn small">
          العودة إلى تفاصيل التصنيف
        </Link>
      </div>

      <form
        action={`/admin/categories/${category.id}/posts`}
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
          href={buildFilterHref(category.id, selectedStatus, "")}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, "ALL", query)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(category.id, status, query)}
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
                <th>Slug</th>
                <th>الحالة</th>
                <th>الظهور</th>
                <th>التاريخ</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.slug ?? "-"}</td>
                  <td>{post.status}</td>
                  <td>{post.visibility}</td>
                  <td>{new Date(post.createdAt).toLocaleString("ar-BH")}</td>
                  <td>
                    <Link href={post.slug ? `/posts/${post.slug}` : "#"} className="btn small">
                      Open Post
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
