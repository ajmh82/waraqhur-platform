import Link from "next/link";
import { AdminPostDeleteButton } from "@/components/admin/admin-post-delete-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminPostsData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
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
    commentsCount: number;
    likesCount: number;
  }>;
}

interface AdminPostsPageResult {
  data: AdminPostsData | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";

const PAGE_SIZE = 10;

async function loadAdminPostsPageData(): Promise<AdminPostsPageResult> {
  try {
    const data = await dashboardApiGet<AdminPostsData>("/api/posts");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load posts.",
    };
  }
}

function buildFilterHref(
  status: string,
  visibility: string,
  query: string,
  sort: SortKey,
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

  if (sort !== "newest") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/admin/posts?${queryString}` : "/admin/posts";
}

function getSortedPosts(posts: AdminPostsData["posts"], sort: SortKey) {
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

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    visibility?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadAdminPostsPageData();
  const currentSearchParams = await searchParams;

  const query = currentSearchParams.q?.trim() ?? "";
  const selectedStatus = currentSearchParams.status?.trim() ?? "ALL";
  const selectedVisibility = currentSearchParams.visibility?.trim() ?? "ALL";
  const selectedSort = (currentSearchParams.sort?.trim() as SortKey) ?? "newest";
  const currentPage = Math.max(1, Number(currentSearchParams.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load posts"
        description={error ?? "Unable to load posts."}
      />
    );
  }

  const totalPosts = data.posts.length;
  const publishedPosts = data.posts.filter((post) => post.status === "PUBLISHED").length;
  const draftPosts = data.posts.filter((post) => post.status === "DRAFT").length;
  const statuses = Array.from(new Set(data.posts.map((post) => post.status))).sort();
  const visibilities = Array.from(new Set(data.posts.map((post) => post.visibility))).sort();

  const filteredPosts = data.posts.filter((post) => {
    const statusMatches =
      selectedStatus === "ALL" || post.status === selectedStatus;

    const visibilityMatches =
      selectedVisibility === "ALL" || post.visibility === selectedVisibility;

    const queryMatches =
      normalizedQuery.length === 0 ||
      post.title.toLowerCase().includes(normalizedQuery) ||
      (post.slug ?? "").toLowerCase().includes(normalizedQuery) ||
      (post.author?.username ?? "").toLowerCase().includes(normalizedQuery) ||
      (post.category?.name ?? "").toLowerCase().includes(normalizedQuery) ||
      (post.source?.name ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatches && visibilityMatches && queryMatches;
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
        title="Posts management"
        description="لوحة موحدة لإدارة كل المنشورات داخل النظام."
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
          <strong>المنشورات المنشورة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{publishedPosts}</p>
        </div>
        <div className="state-card">
          <strong>المسودات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{draftPosts}</p>
        </div>
      </div>

      <form
        action="/admin/posts"
        method="GET"
        style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}
      >
        {selectedStatus !== "ALL" ? (
          <input type="hidden" name="status" value={selectedStatus} />
        ) : null}

        {selectedVisibility !== "ALL" ? (
          <input type="hidden" name="visibility" value={selectedVisibility} />
        ) : null}

        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالعنوان أو slug أو الكاتب أو المصدر"
          className="search-input"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          Search
        </button>

        <Link
          href={buildFilterHref(selectedStatus, selectedVisibility, "", selectedSort, 1)}
          className="btn small"
        >
          Reset Search
        </Link>
      </form>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref("ALL", selectedVisibility, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          All Statuses
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildFilterHref(status, selectedVisibility, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedStatus, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedVisibility === "ALL" ? "primary" : "small"}`}
        >
          All Visibility
        </Link>

        {visibilities.map((visibility) => (
          <Link
            key={visibility}
            href={buildFilterHref(selectedStatus, visibility, query, selectedSort, 1)}
            className={`btn ${selectedVisibility === visibility ? "primary" : "small"}`}
          >
            {visibility}
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link
          href={buildFilterHref(selectedStatus, selectedVisibility, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          Newest First
        </Link>
        <Link
          href={buildFilterHref(selectedStatus, selectedVisibility, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          Oldest First
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> status={selectedStatus}, visibility={selectedVisibility}, search={query || "none"}, sort={getSortLabel(selectedSort)}
        </p>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Showing:</strong> {visibleFrom}-{visibleTo} of {sortedPosts.length}
        </p>
      </div>

      {paginatedPosts.length === 0 ? (
        <EmptyState
          title="لا توجد منشورات"
          description="لا توجد منشورات تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Source</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Comments</th>
                  <th>Created</th>
                  <th>Details</th>
                  <th>Open</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{post.author?.username ?? "-"}</td>
                    <td>{post.source?.name ?? "-"}</td>
                    <td>{post.category?.name ?? "-"}</td>
                    <td>{post.status}</td>
                    <td>{post.visibility}</td>
                    <td>{post.commentsCount}</td>
                    <td>{new Date(post.createdAt).toLocaleString("ar-BH")}</td>
                    <td>
                      <Link href={`/admin/posts/${post.id}`} className="btn small">
                        Post Details
                      </Link>
                    </td>
                    <td>
                      {post.slug ? (
                        <Link href={`/posts/${post.slug}`} className="btn small">
                          Open Post
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <AdminPostDeleteButton postId={post.id} />
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
                selectedStatus,
                selectedVisibility,
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
                selectedStatus,
                selectedVisibility,
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
