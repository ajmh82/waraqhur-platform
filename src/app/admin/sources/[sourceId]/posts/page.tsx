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

const PAGE_SIZE = 10;

async function loadAdminSourcePostsPageData(
  sourceId: string
): Promise<AdminSourcePostsPageResult> {
  try {
    const [sourcesData, postsData] = await Promise.all([
      dashboardApiGet<{ sources: AdminSourceRecord[] }>("/api/sources"),
      dashboardApiGet<{ posts: AdminPostRecord[] }>("/api/posts"),
    ]);

    const source =
      sourcesData.sources.find((item) => item.id === sourceId) ?? null;

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
  visibility: string,
  query: string,
  sort: string,
  page: number
) {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (visibility !== "ALL") {
    params.set("visibility", visibility);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  if (sort !== "LATEST") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
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
  searchParams: Promise<{
    q?: string;
    status?: string;
    visibility?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { sourceId } = await params;
  const { source, posts, error } = await loadAdminSourcePostsPageData(sourceId);
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedVisibility = currentSearchParams.visibility?.trim() ?? "ALL";
  const selectedSort =
    currentSearchParams.sort?.trim() === "OLDEST" ? "OLDEST" : "LATEST";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error) {
    return <ErrorState title="تعذر تحميل منشورات المصدر" description={error} />;
  }

  if (!source) {
    notFound();
  }

  const statuses = Array.from(new Set(posts.map((post) => post.status)));
  const visibilities = Array.from(new Set(posts.map((post) => post.visibility)));
  const totalPosts = posts.length;
  const draftPosts = posts.filter((post) => post.status === "DRAFT").length;
  const publishedPosts = posts.filter((post) => post.status === "PUBLISHED").length;
  const archivedPosts = posts.filter((post) => post.status === "ARCHIVED").length;

  const filteredPosts = posts
    .filter((post) => {
      const statusMatches =
        selectedStatus === "ALL" || post.status === selectedStatus;

      const visibilityMatches =
        selectedVisibility === "ALL" || post.visibility === selectedVisibility;

      const queryMatches =
        normalizedQuery.length === 0 ||
        post.title.toLowerCase().includes(normalizedQuery) ||
        (post.slug ?? "").toLowerCase().includes(normalizedQuery);

      return statusMatches && visibilityMatches && queryMatches;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      return selectedSort === "OLDEST" ? leftTime - rightTime : rightTime - leftTime;
    });

  const totalFilteredPosts = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredPosts / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedPosts = filteredPosts.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleStart = totalFilteredPosts === 0 ? 0 : pageStart + 1;
  const visibleEnd = pageStart + paginatedPosts.length;

  const activeFilters = [
    selectedStatus !== "ALL" ? `Status: ${selectedStatus}` : null,
    selectedVisibility !== "ALL" ? `Visibility: ${selectedVisibility}` : null,
    query ? `Search: ${query}` : null,
  ].filter(Boolean);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title={`منشورات المصدر: ${source.name}`}
        description="عرض جميع المنشورات المرتبطة بهذا المصدر من داخل لوحة الإدارة."
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
        <Link href={`/admin/sources/${source.id}`} className="btn small">
          العودة إلى تفاصيل المصدر
        </Link>
        <Link href={`/admin/sources/${source.id}/posts/new`} className="btn small">
          Create Post Manually
        </Link>
        <Link
          href={buildFilterHref(source.id, "ALL", "ALL", "", "LATEST", 1)}
          className={`btn ${selectedStatus === "ALL" && selectedVisibility === "ALL" && !query && selectedSort === "LATEST" ? "primary" : "small"}`}
        >
          All Posts
        </Link>
        <Link href={`/admin/sources/${source.id}/posts`} className="btn small">
          Reset Filters
        </Link>
        <Link
          href={buildFilterHref(source.id, "DRAFT", selectedVisibility, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "DRAFT" ? "primary" : "small"}`}
        >
          Draft Only
        </Link>
        <Link
          href={buildFilterHref(source.id, "PUBLISHED", selectedVisibility, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "PUBLISHED" ? "primary" : "small"}`}
        >
          Published Only
        </Link>
        <Link
          href={buildFilterHref(source.id, "ARCHIVED", selectedVisibility, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ARCHIVED" ? "primary" : "small"}`}
        >
          Archived Only
        </Link>
        <Link
          href={buildFilterHref(source.id, selectedStatus, "PUBLIC", query, selectedSort, 1)}
          className={`btn ${selectedVisibility === "PUBLIC" ? "primary" : "small"}`}
        >
          Public Only
        </Link>
        <Link
          href={buildFilterHref(source.id, selectedStatus, "PRIVATE", query, selectedSort, 1)}
          className={`btn ${selectedVisibility === "PRIVATE" ? "primary" : "small"}`}
        >
          Private Only
        </Link>
        <Link
          href={buildFilterHref(source.id, selectedStatus, "UNLISTED", query, selectedSort, 1)}
          className={`btn ${selectedVisibility === "UNLISTED" ? "primary" : "small"}`}
        >
          Unlisted Only
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
        {selectedVisibility !== "ALL" ? (
          <input type="hidden" name="visibility" value={selectedVisibility} />
        ) : null}
        {selectedSort !== "LATEST" ? (
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
          href={buildFilterHref(source.id, selectedStatus, selectedVisibility, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      {activeFilters.length > 0 ? (
        <p style={{ marginBottom: "12px" }}>
          الفلاتر النشطة: {activeFilters.join(" | ")}
        </p>
      ) : null}

      <p style={{ marginBottom: "12px" }}>
        الترتيب الحالي: {selectedSort === "OLDEST" ? "Oldest First" : "Latest First"}
      </p>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(source.id, "ALL", selectedVisibility, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(source.id, status, selectedVisibility, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(source.id, selectedStatus, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedVisibility === "ALL" ? "primary" : "small"}`}
        >
          All Visibility
        </Link>

        {visibilities.map((visibility) => (
          <Link
            key={visibility}
            href={buildFilterHref(source.id, selectedStatus, visibility, query, selectedSort, 1)}
            className={`btn ${selectedVisibility === visibility ? "primary" : "small"}`}
          >
            {visibility}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(source.id, selectedStatus, selectedVisibility, query, "LATEST", 1)}
          className={`btn ${selectedSort === "LATEST" ? "primary" : "small"}`}
        >
          Latest First
        </Link>
        <Link
          href={buildFilterHref(source.id, selectedStatus, selectedVisibility, query, "OLDEST", 1)}
          className={`btn ${selectedSort === "OLDEST" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <p style={{ marginBottom: "12px" }}>
        عرض النتائج {visibleStart} - {visibleEnd} من أصل {totalFilteredPosts}
      </p>

      {paginatedPosts.length === 0 ? (
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
              {paginatedPosts.map((post) => (
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

      <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(
            source.id,
            selectedStatus,
            selectedVisibility,
            query,
            selectedSort,
            Math.max(1, safePage - 1)
          )}
          className={`btn ${safePage === 1 ? "small" : "primary"}`}
        >
          Previous
        </Link>
        <div className="state-card" style={{ padding: "10px 14px" }}>
          صفحة {safePage} من {totalPages}
        </div>
        <Link
          href={buildFilterHref(
            source.id,
            selectedStatus,
            selectedVisibility,
            query,
            selectedSort,
            Math.min(totalPages, safePage + 1)
          )}
          className={`btn ${safePage === totalPages ? "small" : "primary"}`}
        >
          Next
        </Link>
      </div>
    </section>
  );
}
