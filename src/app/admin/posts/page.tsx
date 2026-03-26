import Link from "next/link";
import { AdminPostDeleteButton } from "@/components/admin/admin-post-delete-button";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

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
    category: { id: string; name: string; slug: string } | null;
    source: { id: string; name: string; slug: string } | null;
    author: { id: string; email: string; username: string } | null;
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

async function loadData(): Promise<AdminPostsPageResult> {
  try {
    return {
      data: await dashboardApiGet<AdminPostsData>("/api/posts"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تحميل المنشورات.",
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

  if (status !== "ALL") params.set("status", status);
  if (visibility !== "ALL") params.set("visibility", visibility);
  if (query.trim()) params.set("q", query.trim());
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/admin/posts?${qs}` : "/admin/posts";
}

function getSortedPosts(posts: AdminPostsData["posts"], sort: SortKey) {
  const next = [...posts];

  next.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return next;
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
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedVisibility = sp.visibility?.trim() ?? "ALL";
  const selectedSort = sp.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل المنشورات"
        description={error ?? "تعذر تحميل المنشورات."}
      />
    );
  }

  const totalPosts = data.posts.length;
  const publishedPosts = data.posts.filter(
    (post) => post.status === "PUBLISHED"
  ).length;
  const draftPosts = data.posts.filter((post) => post.status === "DRAFT").length;
  const archivedPosts = data.posts.filter(
    (post) => post.status === "ARCHIVED"
  ).length;
  const statuses = Array.from(new Set(data.posts.map((post) => post.status))).sort();
  const visibilities = Array.from(
    new Set(data.posts.map((post) => post.visibility))
  ).sort();

  const filtered = data.posts.filter((post) => {
    const statusMatch =
      selectedStatus === "ALL" || post.status === selectedStatus;
    const visibilityMatch =
      selectedVisibility === "ALL" || post.visibility === selectedVisibility;
    const queryMatch =
      normalizedQuery.length === 0 ||
      post.title.toLowerCase().includes(normalizedQuery) ||
      (post.slug ?? "").toLowerCase().includes(normalizedQuery) ||
      (post.author?.username ?? "").toLowerCase().includes(normalizedQuery) ||
      (post.category?.name ?? "").toLowerCase().includes(normalizedQuery) ||
      (post.source?.name ?? "").toLowerCase().includes(normalizedQuery);

    return statusMatch && visibilityMatch && queryMatch;
  });

  const sorted = getSortedPosts(filtered, selectedSort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginated = sorted.slice(start, end);
  const visibleFrom = sorted.length === 0 ? 0 : start + 1;
  const visibleTo = Math.min(end, sorted.length);

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الإدارة"
        title="إدارة المنشورات"
        description="مراجعة المحتوى المنشور والمسودات والأرشيف مع فلاتر أوضح وتجربة متابعة أسرع."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div className="state-card">
          <strong>الإجمالي</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{totalPosts}</p>
        </div>
        <div className="state-card">
          <strong>منشورة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {publishedPosts}
          </p>
        </div>
        <div className="state-card">
          <strong>مسودات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{draftPosts}</p>
        </div>
        <div className="state-card">
          <strong>مؤرشفة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {archivedPosts}
          </p>
        </div>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          padding: "16px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص سريع</strong>
        <p style={{ margin: 0 }}>
          استخدم الفلاتر التالية للوصول إلى المنشورات حسب الحالة أو مستوى الظهور
          أو الكاتب أو المصدر، مع روابط سريعة إلى صفحة العرض والتعديل.
        </p>
      </div>

      <form
        action="/admin/posts"
        method="GET"
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
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
          placeholder="ابحث بالعنوان أو الكاتب أو المصدر أو التصنيف"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          بحث
        </button>

        <Link
          href={buildFilterHref(selectedStatus, selectedVisibility, "", selectedSort, 1)}
          className="btn small"
        >
          مسح البحث
        </Link>
      </form>

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref("ALL", selectedVisibility, query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          جميع الحالات
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

      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={buildFilterHref(selectedStatus, "ALL", query, selectedSort, 1)}
          className={`btn ${selectedVisibility === "ALL" ? "primary" : "small"}`}
        >
          جميع مستويات الظهور
        </Link>

        {visibilities.map((visibility) => (
          <Link
            key={visibility}
            href={buildFilterHref(
              selectedStatus,
              visibility,
              query,
              selectedSort,
              1
            )}
            className={`btn ${selectedVisibility === visibility ? "primary" : "small"}`}
          >
            {visibility}
          </Link>
        ))}
      </div>

      <div
        style={{
          marginBottom: "18px",
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
            "newest",
            1
          )}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildFilterHref(
            selectedStatus,
            selectedVisibility,
            query,
            "oldest",
            1
          )}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
        </Link>
        <Link href={buildFilterHref("ALL", "ALL", "", "newest", 1)} className="btn small">
          إعادة ضبط الفلاتر
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          عرض {visibleFrom}-{visibleTo} من أصل {sorted.length}
        </p>
      </div>

      {paginated.length === 0 ? (
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
                  <th>العنوان</th>
                  <th>الكاتب</th>
                  <th>المصدر</th>
                  <th>التصنيف</th>
                  <th>الحالة</th>
                  <th>الظهور</th>
                  <th>التعليقات</th>
                  <th>الإعجابات</th>
                  <th>النشر</th>
                  <th>الإنشاء</th>
                  <th>تفاصيل</th>
                  <th>تعديل</th>
                  <th>فتح</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="admin-table__primary">{post.title}</div>
                      <div className="admin-table__secondary">
                        {post.slug ?? "بدون رابط مخصص"}
                      </div>
                    </td>
                    <td>{post.author?.username ?? "-"}</td>
                    <td>{post.source?.name ?? "-"}</td>
                    <td>{post.category?.name ?? "-"}</td>
                    <td>{post.status}</td>
                    <td>{post.visibility}</td>
                    <td>{post.commentsCount}</td>
                    <td>{post.likesCount}</td>
                    <td>
                      {post.publishedAt
                        ? formatDateTimeInMakkah(post.publishedAt, "ar-BH")
                        : "-"}
                    </td>
                    <td>{formatDateTimeInMakkah(post.createdAt, "ar-BH")}</td>
                    <td>
                      <Link href={`/admin/posts/${post.id}`} className="btn small">
                        تفاصيل
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/admin/posts/${post.id}/edit`}
                        className="btn small"
                      >
                        تعديل
                      </Link>
                    </td>
                    <td>
                      {post.slug ? (
                        <Link href={`/posts/${post.slug}`} className="btn small">
                          فتح
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
              السابق
            </Link>
            <span className="btn small">
              صفحة {safePage} / {totalPages}
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
              التالي
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
