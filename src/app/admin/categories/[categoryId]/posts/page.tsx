import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

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

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

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

function buildFilterHref(
  categoryId: string,
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
  return queryString
    ? `/admin/categories/${categoryId}/posts?${queryString}`
    : `/admin/categories/${categoryId}/posts`;
}

function getSortedPosts(
  posts: AdminPostRecord[],
  sort: SortKey
) {
  const nextPosts = [...posts];

  nextPosts.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return nextPosts;
}

function getSortLabel(sort: SortKey) {
  return sort === "oldest" ? "Oldest First" : "Newest First";
}

export default async function AdminCategoryPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const { categoryId } = await params;
  const { category, posts, error } =
    await loadAdminCategoryPostsPageData(categoryId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل منشورات التصنيف" description={error} />;
  }

  if (!category) {
    notFound();
  }

  const statuses = Array.from(new Set(posts.map((post) => post.status))).sort();
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

  const sortedPosts = getSortedPosts(filteredPosts, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedPosts = sortedPosts.slice(startIndex, endIndex);
  const visibleFrom = sortedPosts.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(endIndex, sortedPosts.length);

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

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
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
          href={buildFilterHref(category.id, selectedStatus, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(category.id, status, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(category.id, selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(category.id, selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> category={category.name}, status={selectedStatus}, search={query || "none"}, sort={getSortLabel(selectedSort)}, page={safePage}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedPosts.length}
        </p>
      </div>

      {paginatedPosts.length === 0 ? (
        <EmptyState
          title="لا توجد منشورات مطابقة"
          description="لا توجد منشورات تطابق البحث الحالي أو الفلاتر الحالية."
        />
      ) : (
        <>
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
                {paginatedPosts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{post.slug ?? "-"}</td>
                    <td>{post.status}</td>
                    <td>{post.visibility}</td>
                    <td>{formatDateTimeInMakkah(post.createdAt, "ar-BH")}</td>
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
                category.id,
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
                category.id,
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
