import Link from "next/link";
import { AdminCommentActions } from "@/components/admin/admin-comment-actions";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface AdminCommentsData {
  comments: Array<{
    id: string;
    postId: string;
    parentId: string | null;
    content: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    author: { id: string; email: string; username: string } | null;
    repliesCount: number;
    replies: Array<{
      id: string;
      postId: string;
      parentId: string | null;
      content: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      author: { id: string; email: string; username: string } | null;
      repliesCount: number;
    }>;
  }>;
}

interface Result {
  data: AdminCommentsData | null;
  error: string | null;
}

type SortKey = "newest" | "oldest";
const PAGE_SIZE = 10;

async function loadData(): Promise<Result> {
  try {
    return {
      data: await dashboardApiGet<AdminCommentsData>("/api/comments"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تحميل التعليقات.",
    };
  }
}

function buildHref(
  status: string,
  query: string,
  sort: SortKey,
  page: number
) {
  const params = new URLSearchParams();

  if (status !== "ALL") params.set("status", status);
  if (query.trim()) params.set("q", query.trim());
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/admin/comments?${qs}` : "/admin/comments";
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { data, error } = await loadData();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const selectedStatus = sp.status?.trim() ?? "ALL";
  const selectedSort = sp.sort?.trim() === "oldest" ? "oldest" : "newest";
  const currentPage = Math.max(1, Number(sp.page ?? "1") || 1);
  const normalizedQuery = query.toLowerCase();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل التعليقات"
        description={error ?? "تعذر تحميل التعليقات."}
      />
    );
  }

  const totalComments = data.comments.length;
  const activeComments = data.comments.filter(
    (comment) => comment.status === "ACTIVE"
  ).length;
  const hiddenComments = data.comments.filter(
    (comment) => comment.status === "HIDDEN"
  ).length;
  const statuses = Array.from(
    new Set(data.comments.map((comment) => comment.status))
  ).sort();

  const filtered = data.comments.filter((comment) => {
    const statusMatch =
      selectedStatus === "ALL" || comment.status === selectedStatus;
    const queryMatch =
      normalizedQuery.length === 0 ||
      comment.content.toLowerCase().includes(normalizedQuery) ||
      (comment.author?.username ?? "").toLowerCase().includes(normalizedQuery) ||
      comment.postId.toLowerCase().includes(normalizedQuery);

    return statusMatch && queryMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return selectedSort === "oldest" ? aTime - bTime : bTime - aTime;
  });

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
        title="إدارة التعليقات"
        description="مراجعة التعليقات والردود والحالة العامة للنقاشات من واجهة أوضح وأسهل متابعة."
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
          <strong>إجمالي التعليقات</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {totalComments}
          </p>
        </div>
        <div className="state-card">
          <strong>نشطة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {activeComments}
          </p>
        </div>
        <div className="state-card">
          <strong>مخفية</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {hiddenComments}
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
          استخدم الفلاتر التالية للوصول إلى التعليقات حسب الحالة أو النص أو اسم
          الكاتب، مع روابط مباشرة إلى صفحة التفاصيل والإجراءات الإدارية.
        </p>
      </div>

      <form
        action="/admin/comments"
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
        {selectedSort !== "newest" ? (
          <input type="hidden" name="sort" value={selectedSort} />
        ) : null}

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ابحث في نص التعليق أو اسم الكاتب"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" className="btn small">
          بحث
        </button>

        <Link
          href={buildHref(selectedStatus, "", selectedSort, 1)}
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
          href={buildHref("ALL", query, selectedSort, 1)}
          className={`btn ${selectedStatus === "ALL" ? "primary" : "small"}`}
        >
          جميع الحالات
        </Link>

        {statuses.map((status) => (
          <Link
            key={status}
            href={buildHref(status, query, selectedSort, 1)}
            className={`btn ${selectedStatus === status ? "primary" : "small"}`}
          >
            {status}
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
          href={buildHref(selectedStatus, query, "newest", 1)}
          className={`btn ${selectedSort === "newest" ? "primary" : "small"}`}
        >
          الأحدث أولاً
        </Link>
        <Link
          href={buildHref(selectedStatus, query, "oldest", 1)}
          className={`btn ${selectedSort === "oldest" ? "primary" : "small"}`}
        >
          الأقدم أولاً
        </Link>
      </div>

      <div className="state-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          عرض {visibleFrom}-{visibleTo} من أصل {sorted.length}
        </p>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          title="لا توجد تعليقات"
          description="لا توجد تعليقات تطابق البحث أو الفلاتر الحالية."
        />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>التعليق</th>
                  <th>الكاتب</th>
                  <th>المنشور</th>
                  <th>الردود</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>تفاصيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((comment) => (
                  <tr key={comment.id}>
                    <td style={{ maxWidth: "420px" }}>
                      <div className="admin-table__primary">{comment.content}</div>
                    </td>
                    <td>{comment.author?.username ?? "-"}</td>
                    <td>{comment.postId}</td>
                    <td>{comment.repliesCount}</td>
                    <td>{comment.status}</td>
                    <td>{formatDateTimeInMakkah(comment.createdAt, "ar-BH")}</td>
                    <td>
                      <Link
                        href={`/admin/comments/${comment.id}`}
                        className="btn small"
                      >
                        تفاصيل
                      </Link>
                    </td>
                    <td>
                      <AdminCommentActions
                        comment={{ id: comment.id, status: comment.status }}
                      />
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
              href={buildHref(
                selectedStatus,
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
              href={buildHref(
                selectedStatus,
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
